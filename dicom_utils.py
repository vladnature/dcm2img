"""
dicom_utils.py - DICOM and NIfTI parsing + image conversion utilities
MIT License
"""

import io
import base64
import numpy as np
from PIL import Image


# ── DICOM ────────────────────────────────────────────────────────────────────

def load_dicom(file_bytes: bytes):
    import pydicom
    return pydicom.dcmread(io.BytesIO(file_bytes))


def extract_dicom_metadata(ds) -> dict:
    fields = [
        ("PatientName",               "Patient Name",       str),
        ("PatientID",                 "Patient ID",         str),
        ("PatientAge",                "Patient Age",        str),
        ("PatientSex",                "Patient Sex",        str),
        ("StudyDate",                 "Study Date",         str),
        ("Modality",                  "Modality",           str),
        ("StudyDescription",          "Study Description",  str),
        ("SeriesDescription",         "Series Description", str),
        ("InstitutionName",           "Institution",        str),
        ("Rows",                      "Rows",               int),
        ("Columns",                   "Columns",            int),
        ("SliceThickness",            "Slice Thickness",    float),
        ("PixelSpacing",              "Pixel Spacing",      str),
        ("BitsAllocated",             "Bits Allocated",     int),
        ("PhotometricInterpretation", "Photometric",        str),
    ]
    metadata = {}
    for attr, label, cast in fields:
        try:
            val = getattr(ds, attr)
            metadata[label] = cast(val)
        except Exception:
            pass
    return metadata


def dicom_pixels_to_array(ds) -> np.ndarray:
    arr = ds.pixel_array.astype(np.float64)
    slope = float(getattr(ds, "RescaleSlope", 1))
    intercept = float(getattr(ds, "RescaleIntercept", 0))
    arr = arr * slope + intercept
    if arr.ndim == 3:
        arr = arr[arr.shape[0] // 2]
    return arr


def dicom_window_defaults(ds) -> dict:
    result = {}
    try:
        wc = ds.WindowCenter
        ww = ds.WindowWidth
        result["window_center"] = float(wc[0] if hasattr(wc, "__iter__") else wc)
        result["window_width"]  = float(ww[0] if hasattr(ww, "__iter__") else ww)
    except Exception:
        pass
    return result


# ── NIfTI ────────────────────────────────────────────────────────────────────

def load_nifti(file_bytes: bytes):
    import nibabel as nib
    tmp = io.BytesIO(file_bytes)
    fh = nib.FileHolder(fileobj=tmp)
    img = nib.Nifti1Image.from_file_map({"header": fh, "image": fh})
    return img


def extract_nifti_metadata(img, filename: str = "") -> dict:
    hdr = img.header
    shape = img.shape
    zooms = hdr.get_zooms()
    meta = {
        "Format":     "NIfTI",
        "Filename":   filename,
        "Dimensions": str(shape),
        "Voxel Size": " x ".join(f"{z:.3f}" for z in zooms[:3]) + " mm",
        "Num Slices": shape[2] if len(shape) >= 3 else 1,
        "Data Type":  str(hdr.get_data_dtype()),
    }
    if len(shape) == 4:
        meta["Timepoints"] = shape[3]
    try:
        tr = float(hdr["pixdim"][4])
        if tr > 0:
            meta["TR (s)"] = round(tr, 4)
    except Exception:
        pass
    return meta


def nifti_slice_to_array(img, slice_idx=None):
    data = img.get_fdata()
    if data.ndim == 4:
        data = data[..., 0]
    n_slices = data.shape[2] if data.ndim >= 3 else 1
    if slice_idx is None:
        slice_idx = n_slices // 2
    slice_idx = max(0, min(slice_idx, n_slices - 1))
    arr = data[:, :, slice_idx] if data.ndim == 3 else data
    arr = np.rot90(arr)
    low  = np.percentile(arr, 1)
    high = np.percentile(arr, 99)
    window = {
        "window_center": float((low + high) / 2),
        "window_width":  float(high - low),
        "n_slices":      n_slices,
        "slice_idx":     slice_idx,
    }
    return arr.astype(np.float64), window


# ── SHARED RENDERING ─────────────────────────────────────────────────────────

def array_to_base64_png(arr, window_center=None, window_width=None) -> str:
    if window_center is not None and window_width is not None:
        low  = window_center - window_width / 2
        high = window_center + window_width / 2
    else:
        low  = np.percentile(arr, 1)
        high = np.percentile(arr, 99)
    arr = np.clip(arr, low, high)
    arr = ((arr - low) / (high - low) * 255) if high > low else np.zeros_like(arr)
    img = Image.fromarray(arr.astype(np.uint8)).convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")
