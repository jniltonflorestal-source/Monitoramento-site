from pathlib import Path
from pypdf import PdfReader
import pypdfium2 as pdfium
from PIL import Image

root = Path('tmp/pdfs')
for name in ['municipal-completo', 'municipal-sem-dados']:
    path = root / f'{name}.pdf'
    reader = PdfReader(path)
    assert len(reader.pages) == 4, f'{name}: {len(reader.pages)} pages instead of 4'
    texts = [page.extract_text() or '' for page in reader.pages]
    assert all(len(text) > 400 for text in texts), 'Blank or near-blank page'
    assert all('Defesa Civil do Tocantins' in text for text in texts)
    assert all('Bombeiros 193' in text for text in texts)
    assert all('Imprimir / Salvar PDF' not in text for text in texts)
    assert all(abs(float(page.mediabox.width) - 595.3) < 2 for page in reader.pages)
    assert all(abs(float(page.mediabox.height) - 841.9) < 2 for page in reader.pages)
    document = pdfium.PdfDocument(str(path))
    thumbnails = []
    for index in range(len(document)):
        image = document[index].render(scale=1.5).to_pil()
        image.save(root / f'{name}-{index + 1}.png')
        image.thumbnail((600, 850))
        thumbnails.append(image)
    sheet = Image.new('RGB', (1200, 1700), 'white')
    for index, image in enumerate(thumbnails):
        sheet.paste(image, ((index % 2) * 600, (index // 2) * 850))
    sheet.save(root / f'{name}-overview.png')
    print(f'{name}: 4 A4 pages, nonblank, institutional header/footer and no print controls')
