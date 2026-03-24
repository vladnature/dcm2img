"""
main.py - FastAPI backend for DICOM/NIfTI Viewer
MIT License
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from dicom_utils import (
    load_dicom, extract_dicom_metadata, dicom_pixels_to_array,
    dicom_window_defaults, array_to_base64_png,
    load_nifti, extract_nifti_metadata, nifti_slice_to_array,
)

app = FastAPI(
    title="Medical Image Viewer API",
    description="Open-source DICOM/NIfTI visualization backend — MIT License",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "message": "Medical Image Viewer API is running"}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload a .dcm or .nii / .nii.gz file.
    Returns metadata, base64 PNG image, window settings, and slice info.
    """
    name = file.filename.lower()
    raw  = await file.read()

    # ── NIfTI ──
    if name.endswith(".nii") or name.endswith(".nii.gz"):
        try:
            img = load_nifti(raw)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Failed to parse NIfTI: {e}")
        try:
            metadata          = extract_nifti_metadata(img, file.filename)
            arr, window_info  = nifti_slice_to_array(img)
            image_b64         = array_to_base64_png(
                arr,
                window_center=window_info["window_center"],
                window_width =window_info["window_width"],
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Processing error: {e}")

        return JSONResponse({
            "filename": file.filename,
            "format":   "nifti",
            "metadata": metadata,
            "window":   {
                "window_center": window_info["window_center"],
                "window_width":  window_info["window_width"],
            },
            "slices": {
                "n_slices":  window_info["n_slices"],
                "slice_idx": window_info["slice_idx"],
            },
            "image": image_b64,
        })

    # ── DICOM ──
    elif name.endswith(".dcm"):
        try:
            ds = load_dicom(raw)
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Failed to parse DICOM: {e}")
        try:
            metadata  = extract_dicom_metadata(ds)
            window    = dicom_window_defaults(ds)
            arr       = dicom_pixels_to_array(ds)
            image_b64 = array_to_base64_png(
                arr,
                window_center=window.get("window_center"),
                window_width =window.get("window_width"),
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Processing error: {e}")

        return JSONResponse({
            "filename": file.filename,
            "format":   "dicom",
            "metadata": metadata,
            "window":   window,
            "slices":   {"n_slices": 1, "slice_idx": 0},
            "image":    image_b64,
        })

    else:
        raise HTTPException(status_code=400, detail="Unsupported file type. Upload .dcm or .nii / .nii.gz")


@app.post("/slice")
async def get_slice(
    file: UploadFile = File(...),
    slice_idx:     int   = Query(...),
    window_center: float = Query(None),
    window_width:  float = Query(None),
):
    """Return a specific axial slice of a NIfTI volume with optional W/L."""
    name = file.filename.lower()
    raw  = await file.read()

    if not (name.endswith(".nii") or name.endswith(".nii.gz")):
        raise HTTPException(status_code=400, detail="Slice navigation only supported for NIfTI files")

    try:
        img          = load_nifti(raw)
        arr, win_inf = nifti_slice_to_array(img, slice_idx=slice_idx)
        wc = window_center if window_center is not None else win_inf["window_center"]
        ww = window_width  if window_width  is not None else win_inf["window_width"]
        image_b64    = array_to_base64_png(arr, wc, ww)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return JSONResponse({
        "image":     image_b64,
        "slice_idx": win_inf["slice_idx"],
        "n_slices":  win_inf["n_slices"],
    })


@app.post("/window")
async def apply_window(
    file: UploadFile = File(...),
    window_center: float = Query(...),
    window_width:  float = Query(...),
    slice_idx:     int   = Query(0),
):
    """Re-render with custom W/L (works for both DICOM and NIfTI)."""
    name = file.filename.lower()
    raw  = await file.read()
    try:
        if name.endswith(".nii") or name.endswith(".nii.gz"):
            img = load_nifti(raw)
            arr, _ = nifti_slice_to_array(img, slice_idx=slice_idx)
        else:
            ds  = load_dicom(raw)
            arr = dicom_pixels_to_array(ds)
        image_b64 = array_to_base64_png(arr, window_center, window_width)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return JSONResponse({"image": image_b64})


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
