"""Kiểm tra model.json xuất ra đúng: tự tính lại bằng numpy phải ra đúng xác suất của model gốc."""
import base64, json, os

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = os.path.join(ROOT, "..", "web", "public", "model", "model.json")
FIXTURE = os.path.join(ROOT, "tests", "fixtures", "parity.json")


def f32(s):
    return np.frombuffer(base64.b64decode(s), "<f4")


def test_export_roundtrip():
    m, fx = json.load(open(MODEL, encoding="utf-8")), json.load(open(FIXTURE))
    x = (np.array(fx["vector"], np.float32) - f32(m["mean"])) / f32(m["std"])
    for i, layer in enumerate(m["layers"]):
        x = x @ f32(layer["W"]).reshape(layer["shape"]) + f32(layer["b"])
        if i < len(m["layers"]) - 1:
            x = np.maximum(x, 0)
    p = np.exp(x - x.max()); p /= p.sum()
    assert np.allclose(p, fx["probs"], atol=1e-5)
    assert len(m["labels"]) == 20
