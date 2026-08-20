import os
import json
import pandas as pd
import sys

def main():
    print("Starting sample download and extraction...")
    
    url = "https://huggingface.co/datasets/ai4bharat/MSMARCO-XI/resolve/main/validation/hinval.parquet"
    limit = 200 # Stratified sample limit
    
    # Ensure data directory exists
    os.makedirs("data", exist_ok=True)
    out_file = "data/sample-passages.json"
    
    print(f"Reading parquet from {url}...")
    try:
        # Load the parquet file (will download it)
        df = pd.read_parquet(url)
        print(f"Successfully loaded parquet. Total rows: {len(df)}")
        
        # Take the first N rows
        sample_df = df.head(limit)
        
        # Parse records
        records = []
        for idx, row in sample_df.iterrows():
            # Extract query
            query = row.get("query", "")
            
            # Extract passages structure
            # Parquet representation of passages is typically a dict with lists:
            # {'passage_text': [...], 'is_selected': [...]}
            passages_data = row.get("passages", {})
            
            # Extract list of passages
            passage_texts = []
            is_selected_list = []
            
            if isinstance(passages_data, dict):
                passage_texts = passages_data.get("passage_text", [])
                is_selected_list = passages_data.get("is_selected", [])
            elif hasattr(passages_data, "tolist"):
                # Handle numpy / pandas object
                p_dict = passages_data
                if hasattr(p_dict, "item"):
                    p_dict = p_dict.item()
                if isinstance(p_dict, dict):
                    passage_texts = p_dict.get("passage_text", [])
                    is_selected_list = p_dict.get("is_selected", [])
            
            # Reconstruct list of dicts for our typescript consumption
            reconstructed_passages = []
            for p_idx, text in enumerate(passage_texts):
                is_sel = False
                if p_idx < len(is_selected_list):
                    is_sel = bool(is_selected_list[p_idx])
                
                reconstructed_passages.append({
                    "text": text,
                    "isSelected": is_sel,
                    "rank": p_idx
                })
            
            # Extract answers
            answers = row.get("answers", [])
            if hasattr(answers, "tolist"):
                answers = answers.tolist()
            
            records.append({
                "queryId": f"q_{idx}",
                "query": query,
                "passages": reconstructed_passages,
                "answers": answers
            })
            
        # Write to JSON
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(records, f, ensure_ascii=False, indent=2)
            
        print(f"Successfully wrote {len(records)} sample passages to {out_file}")
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
