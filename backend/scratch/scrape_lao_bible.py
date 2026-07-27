import urllib.request
import re
import json
import os
import time

def clean_text(text):
    # Remove HTML tags
    text = re.sub(r'<[^>]*>', '', text)
    # Remove soft hyphens and zero-width spaces
    text = text.replace('\xad', '').replace('&shy;', '').replace('\u200b', '')
    # Clean whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def scrape_chapter(book_name, chapter):
    url = f"https://laobible.net/laoeng/{book_name}{chapter}.html"
    print(f"Fetching {book_name} Chapter {chapter} from: {url}")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8')
            
        # Parse rows using regex: matches <tr><th id="X">X</th><td>Lao</td><td>Eng</td></tr>
        pattern = re.compile(r'<tr><th id="(\d+)">.*?</th><td>(.*?)</td><td>(.*?)</td></tr>', re.DOTALL)
        matches = pattern.findall(html)
        
        verses = []
        for verse_num_str, lao_html, eng_html in matches:
            verse_num = int(verse_num_str)
            lao_text = clean_text(lao_html)
            eng_text = clean_text(eng_html)
            verses.append({
                "verse": verse_num,
                "text_lao": lao_text,
                "text_eng": eng_text
            })
        return verses
    except Exception as e:
        print(f"Error fetching/parsing chapter {chapter}: {e}")
        return None

def main():
    # Change books and chapter counts as needed
    # Example: "Matthew" (28 chapters), "Mark" (16), "Luke" (24), "John" (21)
    books = {
        "Matthew": 28,
        "Mark": 16,
        "Luke": 24,
        "John": 21
    }
    
    bible_data = {}
    
    print("=== Starting Lao Bible Scraper from laobible.net ===")
    print("This will download the requested Gospels and save them as a single JSON database.")
    
    # Scrape first 2 chapters of each Gospel as a demonstration (change ch_count for full books)
    demo_limit = True 
    
    for book, max_ch in books.items():
        bible_data[book] = {}
        ch_limit = 2 if demo_limit else max_ch
        print(f"\nScraping {book} (Chapters 1 to {ch_limit})...")
        
        for ch in range(1, ch_limit + 1):
            verses = scrape_chapter(book, ch)
            if verses:
                bible_data[book][str(ch)] = verses
                print(f"  -> Chapter {ch}: {len(verses)} verses parsed successfully.")
            time.sleep(1) # Polite sleep delay
            
    output_file = "Lao_Gospels_Database.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(bible_data, f, ensure_ascii=False, indent=2)
        
    print(f"\n=== Completed! Saved database to: {os.path.abspath(output_file)} ===")

if __name__ == "__main__":
    main()
