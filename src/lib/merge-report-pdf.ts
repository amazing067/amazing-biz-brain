/**
 * 템플릿 PDF와 자동 생성 페이지를 합쳐 하나의 PDF 버퍼로 반환.
 * - mergeTemplateWithPages34: 템플릿 1·2 + 생성 3·4 + 템플릿 5~끝 (기존)
 * - mergeTemplateWithPages1234: 생성 1·2 + 생성 3·4 + 템플릿 5~끝 (고객명·검사일·단계 반영)
 */
import { PDFDocument } from 'pdf-lib';

/** 생성 1·2 + 생성 3·4 + 템플릿 5~16 (1·2·3·4는 JSON 기반 동적 생성) */
export async function mergeTemplateWithPages1234(
  templatePdfBuffer: Buffer,
  pages12PdfBuffer: Buffer,
  pages34PdfBuffer: Buffer
): Promise<Buffer> {
  const templateDoc = await PDFDocument.load(templatePdfBuffer);
  const pages12Doc = await PDFDocument.load(pages12PdfBuffer);
  const pages34Doc = await PDFDocument.load(pages34PdfBuffer);

  const templatePageCount = templateDoc.getPageCount();
  if (pages12Doc.getPageCount() < 2) throw new Error('1·2페이지 PDF는 2페이지여야 합니다.');
  if (pages34Doc.getPageCount() < 2) throw new Error('3·4페이지 PDF는 2페이지여야 합니다.');

  const outDoc = await PDFDocument.create();

  const p12 = await outDoc.copyPages(pages12Doc, [0, 1]);
  p12.forEach((p) => outDoc.addPage(p));
  const p34 = await outDoc.copyPages(pages34Doc, [0, 1]);
  p34.forEach((p) => outDoc.addPage(p));

  if (templatePageCount > 4) {
    const rest = Array.from({ length: templatePageCount - 4 }, (_, i) => i + 4);
    const restPages = await outDoc.copyPages(templateDoc, rest);
    restPages.forEach((p) => outDoc.addPage(p));
  }

  return Buffer.from(await outDoc.save());
}

/** 템플릿 1·2 + 생성 3·4 + 템플릿 5~끝 (1·2는 템플릿 그대로 사용할 때) */
export async function mergeTemplateWithPages34(
  templatePdfBuffer: Buffer,
  pages34PdfBuffer: Buffer
): Promise<Buffer> {
  const templateDoc = await PDFDocument.load(templatePdfBuffer);
  const pages34Doc = await PDFDocument.load(pages34PdfBuffer);

  const templatePageCount = templateDoc.getPageCount();
  const pages34PageCount = pages34Doc.getPageCount();

  if (pages34PageCount < 2) {
    throw new Error(`3·4페이지 PDF는 최소 2페이지여야 합니다. (현재: ${pages34PageCount}페이지)`);
  }

  const outDoc = await PDFDocument.create();

  const templateFirst = await outDoc.copyPages(templateDoc, [0, 1]);
  templateFirst.forEach((p) => outDoc.addPage(p));

  const generated = await outDoc.copyPages(pages34Doc, [0, 1]);
  generated.forEach((p) => outDoc.addPage(p));

  if (templatePageCount > 4) {
    const rest = Array.from({ length: templatePageCount - 4 }, (_, i) => i + 4);
    const restPages = await outDoc.copyPages(templateDoc, rest);
    restPages.forEach((p) => outDoc.addPage(p));
  }

  return Buffer.from(await outDoc.save());
}
