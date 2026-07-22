import html2canvas from "html2canvas";

async function waitForImages(container) {
  const imgs = Array.from(container.querySelectorAll("img"));
  if (imgs.length === 0) return;
  await Promise.all(
    imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise((resolve) => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
        setTimeout(done, 4000);
      });
    })
  );
}

async function renderToCanvas(node) {
  await new Promise((r) => setTimeout(r, 120));
  return html2canvas(node, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#ffffff",
    logging: false,
    scrollX: 0,
    scrollY: 0,
    windowWidth: document.documentElement.clientWidth,
    windowHeight: document.documentElement.clientHeight,
  });
}

function buildPdfFromCanvas(canvas, fileName, opts) {
  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  return import("jspdf").then(({ default: jsPDF }) => {
    const pdf = new jsPDF({
      orientation: opts.landscape ? "landscape" : "portrait",
      unit: "mm",
      format: "a4",
    });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    let heightLeft = imgH;
    let position = 0;
    pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0) {
      position -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
      heightLeft -= pageH;
    }
    pdf.save(fileName);
  });
}

export async function captureNodeToPdf(node, fileName = "report.pdf", opts = {}) {
  const fallbackNode = node || document.body;
  await waitForImages(fallbackNode);

  let canvas;
  try {
    canvas = await renderToCanvas(fallbackNode);
    if (!canvas || !canvas.width || !canvas.height) throw new Error("empty canvas");
  } catch {
    const clone = fallbackNode.cloneNode(true);
    clone.style.width = "100%";
    clone.style.maxWidth = "794px";
    clone.querySelectorAll("img").forEach((img) => img.remove());
    canvas = await renderToCanvas(clone);
  }

  if (!canvas || !canvas.width || !canvas.height) {
    throw new Error("تعذر إنشاء ملف PDF من المحتوى المطلوب");
  }

  await buildPdfFromCanvas(canvas, fileName, opts);
}