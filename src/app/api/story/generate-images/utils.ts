import FormData from "form-data";

export async function prepareImagePayload(
  imageInput: string,
  prompt: string
) {
  try {
    let imageBuffer;
    let contentType;

    // Handle URL input
    if (imageInput.startsWith("http")) {
      const response = await fetch(imageInput);
      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
      contentType =
        response.headers.get("content-type") ||
        getContentTypeFromUrl(imageInput);
      console.log("imageBuffer created from URL");
    }
    // Handle base64 input
    else if (imageInput.startsWith("data:image")) {
      const matches = imageInput.match(
        /^data:(image\/(jpeg|png|webp));base64,/
      );
      if (!matches) {
        throw new Error("Invalid image format. Must be jpeg, png, or webp.");
      }
      contentType = matches[1];
      const base64Data = imageInput.split(",")[1];
      imageBuffer = Buffer.from(base64Data, "base64");
    } else {
      throw new Error("Invalid image input. Must be URL or base64 string.");
    }

    // Validate content type
    if (!isValidContentType(contentType)) {
      throw new Error("Invalid image format. Must be jpeg, png, or webp.");
    }

    // Create FormData
    const formData = new FormData();
    formData.append("image", imageBuffer);
    formData.append("prompt", prompt);
    formData.append("output_format", "png");

    console.log('formData complete', formData);
    return formData;
  } catch (error) {
    console.error("Error preparing image:", error);
    throw error;
  }
}

// Helper function to get content type from URL
function getContentTypeFromUrl(url: string) {
  const parts = url.split(".");
  const extension = parts.length > 1 ? parts.pop()?.toLowerCase() ?? "" : "";
  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

// Helper function to validate content type
function isValidContentType(contentType: string): boolean {
  const validTypes = ["image/jpeg", "image/png", "image/webp"];
  return validTypes.includes(contentType);
}
