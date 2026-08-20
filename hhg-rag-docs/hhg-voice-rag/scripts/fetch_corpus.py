from datasets import load_dataset
import json

print("Loading dataset...")
ds = load_dataset("ai4bharat/MSMARCO-XI", "hi", split="corpus", streaming=True)

sample = []
for idx, row in enumerate(ds):
    if idx >= 200:
        break
    sample.append({
        "id": str(row.get('_id', idx)),
        "text": str(row.get('text', '')),
        "language": "hi",
        "metadata": { "source": "msmarco" }
    })

with open("data/sample-passages.json", "w", encoding="utf-8") as f:
    json.dump(sample, f, ensure_ascii=False, indent=2)

print(f"Saved {len(sample)} passages to data/sample-passages.json")
