const fs = require("fs");
const path = require("path");

const queries = [
  // National symbols & identity
  "National Bird of India",
  "National Bird of India.",
  "what is the national bird of india",
  "what is the national bird of india?",
  "national bird",
  "bharat ka rashtriya pakshi",
  "bharat ka rashtriya pakshi kya hai",
  "bharat ka rashtriya pakshi kaun sa hai?",
  "भारत का राष्ट्रीय पक्षी क्या है?",
  "भारत का राष्ट्रीय पक्षी कौन सा है?",
  "भारत का राष्ट्रीय पक्षी",
  "National Animal of India",
  "National Animal of India.",
  "what is the national animal of india",
  "what is the national animal of india?",
  "bharat ka rashtriya pashu",
  "bharat ka rashtriya pashu kaun sa hai?",
  "भारत का राष्ट्रीय पशु क्या है?",
  "भारत का राष्ट्रीय पशु कौन सा है?",
  "भारताचा राष्ट्रीय प्राणी कोणता आहे?",
  "भारताचा राष्ट्रीय प्राणी",
  "राष्ट्रीय प्रतीक",
  "National symbols of India",
  "national emblem of india",

  // Geography & Capital
  "what is the capital of india",
  "what is the capital of india?",
  "capital of india",
  "bharat ki rajdhani",
  "bharat ki rajdhani kya hai",
  "bharat ki rajdhani kya hai?",
  "भारत की राजधानी क्या है?",
  "भारत की राजधानी",
  "Himalayas",
  "himalaya parvat",
  "हिमालय पर्वतमाला",
  "highest mountain in india",
  "भारत की सबसे ऊंची चोटी कौन सी है?",

  // Technology & AI
  "what is artificial intelligence",
  "what is artificial intelligence?",
  "what is machine learning",
  "what is machine learning?",
  "what is AI",
  "what is AI?",
  "AI in India",
  "artificial intelligence in india",
  "कृत्रिम बुद्धिमत्ता क्या है?",
  "एआई क्या है?",
  "मशीन लर्निंग क्या है?",

  // Health & Yoga
  "when is international yoga day celebrated",
  "when is international yoga day celebrated?",
  "international yoga day",
  "yoga day",
  "antarrashtriya yog diwas kab manaya jata hai",
  "अंतर्राष्ट्रीय योग दिवस कब मनाया जाता है?",
  "योग दिवस कब मनाया जाता है?",
  "योग दिवस",
  "what is ayurveda",
  "what is ayurveda?",
  "आयुर्वेद क्या है?",
  "आयुर्वेद के तीन दोष कौन से हैं?",

  // Science & Energy
  "how does solar energy work",
  "how does solar energy work?",
  "solar energy in india",
  "solar power",
  "saur urja kaise kaam karti hai",
  "सौर ऊर्जा कैसे काम करती है?",
  "सौर ऊर्जा",
  "renewable energy in india",

  // Space & ISRO
  "what are the major missions of isro",
  "what are the major missions of isro?",
  "isro missions",
  "chandrayaan 3",
  "isro ke pramukh mission kaun se hain",
  "isro ke pramukh mission kaun se hain?",
  "इसरो के प्रमुख मिशन कौन से हैं?",
  "इसरो मिशन",
  "चंद्रयान ३",
  "चंद्रयान-३ मिशन कब लॉन्च हुआ?",

  // Government & Economy & UPI
  "what is the objective of digital india mission",
  "what is the objective of digital india mission?",
  "digital india",
  "digital india mission",
  "digital india mission ka uddeshya kya hai",
  "डिजिटल इंडिया मिशन का उद्देश्य क्या है?",
  "डिजिटल इंडिया",
  "what is upi",
  "what is upi?",
  "how does upi work",
  "how does upi work?",
  "यूपीआई क्या है?",
  "यूपीआई कैसे काम करता है?",

  // History & Constitution
  "who was mahatma gandhi",
  "who was mahatma gandhi?",
  "mahatma gandhi",
  "महात्मा गांधी कौन थे?",
  "राष्ट्रपिता",
  "when did the constitution of india come into effect",
  "constitution of india",
  "bharat ka samvidhan kab lagu hua",
  "भारत का संविधान कब लागू हुआ?",
  "संविधान सभा के प्रारूप समिति के अध्यक्ष कौन थे?"
];

const JINA_API_KEY = "jina_1797f9cf751e42a883f9a3f5381fed6bg1cdMD6NYtEC052ooinYq00214nF";

function normalizeText(text) {
  return text.trim().toLowerCase().replace(/[.,?!।|]/g, "").replace(/\s+/g, " ");
}

async function main() {
  console.log(`Embedding ${queries.length} comprehensive queries via Jina v3...`);

  const resp = await fetch("https://api.jina.ai/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${JINA_API_KEY}`,
    },
    body: JSON.stringify({
      model: "jina-embeddings-v3",
      task: "retrieval.query",
      dimensions: 1024,
      embedding_type: "float",
      input: queries,
    }),
  });

  const data = await resp.json();
  if (!data.data || !Array.isArray(data.data)) {
    console.error("Failed to embed queries:", data);
    process.exit(1);
  }

  const cacheMap = {};
  queries.forEach((q, idx) => {
    const key = `jina-embeddings-v3:query:${normalizeText(q)}`;
    const vec = data.data[idx].embedding;
    cacheMap[key] = vec;
  });

  const outputPath = path.join(__dirname, "..", "data", "precomputed_query_embeddings.json");
  fs.writeFileSync(outputPath, JSON.stringify(cacheMap));
  console.log(`✓ Successfully saved ${Object.keys(cacheMap).length} precomputed query embeddings to ${outputPath}`);
}

main().catch(console.error);
