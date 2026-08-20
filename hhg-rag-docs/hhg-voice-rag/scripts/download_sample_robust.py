import os
import json
import pandas as pd
import requests
import sys

def main():
    # Make stdout unbuffered so progress prints immediately
    sys.stdout.reconfigure(line_buffering=True)
    
    print("Starting robust sample download...")
    url = "https://huggingface.co/datasets/ai4bharat/MSMARCO-XI/resolve/main/validation/hinval.parquet"
    
    os.makedirs("data", exist_ok=True)
    tmp_parquet = "data/temp_hinval.parquet"
    out_file = "data/sample-passages.json"
    
    print(f"Downloading parquet from: {url}")
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        block_size = 1024 * 1024 # 1MB chunks
        
        downloaded = 0
        print(f"Total file size: {total_size / (1024 * 1024):.2f} MB")
        
        with open(tmp_parquet, "wb") as f:
            for data in response.iter_content(block_size):
                f.write(data)
                downloaded += len(data)
                if total_size > 0:
                    percent = (downloaded / total_size) * 100
                    print(f"Downloaded: {downloaded / (1024 * 1024):.2f} MB / {total_size / (1024 * 1024):.2f} MB ({percent:.1f}%)")
                else:
                    print(f"Downloaded: {downloaded / (1024 * 1024):.2f} MB")
        
        print("Download complete. Reading parquet file...")
        df = pd.read_parquet(tmp_parquet)
        print(f"Parquet loaded successfully. Total rows: {len(df)}")
        
        # Extract sample
        limit = 200
        sample_df = df.head(limit)
        records = []
        
        for idx, row in sample_df.iterrows():
            query = row.get("query", "")
            passages_data = row.get("passages", {})
            
            passage_texts = []
            is_selected_list = []
            
            if isinstance(passages_data, dict):
                passage_texts = passages_data.get("passage_text", [])
                is_selected_list = passages_data.get("is_selected", [])
            elif hasattr(passages_data, "tolist"):
                p_dict = passages_data
                if hasattr(p_dict, "item"):
                    p_dict = p_dict.item()
                if isinstance(p_dict, dict):
                    passage_texts = p_dict.get("passage_text", [])
                    is_selected_list = p_dict.get("is_selected", [])
            
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
            
            answers = row.get("answers", [])
            if hasattr(answers, "tolist"):
                answers = answers.tolist()
            
            records.append({
                "queryId": f"q_{idx}",
                "query": query,
                "passages": reconstructed_passages,
                "answers": answers
            })
            
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(records, f, ensure_ascii=False, indent=2)
            
        print(f"Successfully wrote {len(records)} sample passages to {out_file}")
        
        # Cleanup temporary parquet file
        if os.path.exists(tmp_parquet):
            os.remove(tmp_parquet)
            print("Temporary parquet file removed.")
            
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
