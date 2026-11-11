const categoryNames = { skin: "Skin", hair: "Hair", beard: "Beard" };

function createAiReport(predictions) {
  const results = [];
  const recommendations = [
    "AI estimates are for cosmetic exploration only; they are not a medical assessment or diagnosis."
  ];

  for (const prediction of predictions) {
    const detected = prediction.predictions.filter((item) => item.detected);
    if (prediction.category === "skin") {
      results.push({
        category: "skin",
        question: "Possible acne labels (visual estimate)",
        answer: detected.length
          ? detected.map((item) => item.label).join(", ")
          : "No acne labels exceeded the model thresholds"
      });
      recommendations.push(
        "The skin model only estimates five acne labels and may be unreliable across people, skin tones, lighting, and cameras."
      );
      recommendations.push(
        "For persistent, painful, or worrying skin concerns, consult a qualified health professional."
      );
    } else if (prediction.category === "hair") {
      const result = detected[0] || prediction.predictions[0];
      results.push({
        category: "hair",
        question: "Most likely hair texture (visual estimate)",
        answer: `${result.label} (${Math.round(result.score * 100)}% model confidence)`
      });
      recommendations.push(
        "The hair model estimates a hair texture; it does not assess hair loss, dandruff, or hair health."
      );
    } else {
      const result = detected[0] || prediction.predictions[0];
      results.push({
        category: "beard",
        question: "Beard presence (visual estimate)",
        answer: `${result.label} (${Math.round(result.score * 100)}% model confidence)`
      });
      recommendations.push(
        "The beard model estimates beard presence only; it does not identify beard styles."
      );
    }
  }

  return {
    assessmentType: "ai",
    categories: predictions.map(({ category }) => category),
    answers: {},
    results,
    predictions,
    recommendations: [...new Set(recommendations)],
    summary: `AI-assisted visual estimates for ${predictions.map(({ category }) => categoryNames[category]).join(", ")}. Uploaded images were processed temporarily and are not saved. This is not a medical diagnosis.`
  };
}

module.exports = { createAiReport };
