import unittest
from io import BytesIO

from fastapi import HTTPException
from fastapi.testclient import TestClient
from PIL import Image

from app import MODELS, app, decode_image


class ImageValidationTests(unittest.TestCase):
    def test_decodes_supported_images_as_rgb(self):
        buffer = BytesIO()
        Image.new("RGBA", (12, 8), (120, 40, 20, 128)).save(buffer, format="PNG")

        decoded = decode_image(buffer.getvalue())

        self.assertEqual(decoded.mode, "RGB")
        self.assertEqual(decoded.size, (12, 8))

    def test_rejects_empty_and_malformed_images(self):
        for content in (b"", b"not an image"):
            with self.subTest(content=content), self.assertRaises(HTTPException):
                decode_image(content)

    def test_model_revisions_are_pinned(self):
        self.assertEqual(set(MODELS), {"skin", "hair", "beard"})
        for model in MODELS.values():
            self.assertRegex(model["revision"], r"^[0-9a-f]{40}$")


class ApiTests(unittest.TestCase):
    def test_health_and_invalid_category(self):
        client = TestClient(app)
        health = client.get("/health")
        response = client.post(
            "/predict",
            data={"category": "unknown"},
            files={"image": ("photo.png", b"not an image", "image/png")},
        )

        self.assertEqual(health.status_code, 200)
        self.assertEqual(health.json(), {"status": "ok"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("skin, hair, or beard", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
