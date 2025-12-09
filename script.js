const video = document.getElementById("video");
const captureBtn = document.getElementById("captureBtn");
const downloadBtn = document.getElementById("downloadBtn");
const canvas = document.getElementById("canvas");

let slotCounter = 1;

/* ======================
   1. Nyalakan Kamera
====================== */
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => video.srcObject = stream)
  .catch(err => alert("Kamera tidak bisa diakses!"));

/* ======================
   2. Ambil Foto (Sudah termasuk Flip Mirror)
====================== */
captureBtn.addEventListener("click", () => {
  const ctx = canvas.getContext("2d");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  // Flip horizontal untuk mencegah kamera depan mirror
  ctx.save();
  ctx.scale(-1, 1); 
  ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height); 
  ctx.restore();

  let dataURL = canvas.toDataURL("image/png");

  // Masukkan gambar ke slot
  const currentSlot = document.getElementById(`slot${slotCounter}`);
  currentSlot.src = dataURL;

  slotCounter++;
  if (slotCounter > 3) slotCounter = 1;
});


/* ======================
   4. Fungsi Draw (Object-fit: Cover)
====================== */
// Fungsi untuk menggambar gambar ke canvas dengan efek 'object-fit: cover'
function drawCroppedImage(ctx, image, targetX, targetY, targetWidth, targetHeight) {
    const imgWidth = image.naturalWidth;
    const imgHeight = image.naturalHeight;
    const targetRatio = targetWidth / targetHeight;
    const imageRatio = imgWidth / imgHeight;

    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = imgWidth;
    let sourceHeight = imgHeight;

    if (imageRatio > targetRatio) {
        // Gambar lebih lebar dari target, pangkas horizontal
        sourceWidth = imgHeight * targetRatio;
        sourceX = (imgWidth - sourceWidth) / 2;
    } else {
        // Gambar lebih tinggi dari target, pangkas vertikal
        sourceHeight = imgWidth / targetRatio;
        sourceY = (imgHeight - sourceHeight) / 2;
    }

    ctx.drawImage(
        image, 
        sourceX, sourceY, sourceWidth, sourceHeight, 
        targetX, targetY, targetWidth, targetHeight
    );
}

/* ======================
   3. Download Hasil (Frame di atas Foto)
====================== */
downloadBtn.addEventListener("click", () => {
  const finalCanvas = document.createElement("canvas");
  const ctx = finalCanvas.getContext("2d");

  const frameImg = document.querySelector(".frame-img");

  finalCanvas.width = frameImg.naturalWidth;
  finalCanvas.height = frameImg.naturalHeight;

  // --- 1. Definisikan Koordinat dan Ukuran Slot (Berbasis Proporsi Frame) ---
  const FRAME_WIDTH = finalCanvas.width;
  const FRAME_HEIGHT = finalCanvas.height;

  // Hitungan proporsi dari CSS: width 78%, left 40px (dari 450px total)
  // Posisi dan lebar yang presisi
  const x_pos = FRAME_WIDTH * 0.11;     // ~11% dari kiri
  const w_slot = FRAME_WIDTH * 0.78;     // ~78% lebar slot

  // Tinggi slot (berdasarkan proporsi CSS 20% dari tinggi frame)
  const slotHeight = FRAME_HEIGHT * 0.22; // Disesuaikan sedikit agar pas dengan bingkai

  // Posisi Y (tinggi):
  const offsetTop = FRAME_HEIGHT * 0.11; // Jarak dari atas ke slot 1
  const slotSpacing = FRAME_HEIGHT * 0.24; // Jarak vertikal antara slot

  const y_slot1 = offsetTop;
  const y_slot2 = offsetTop + slotSpacing;
  const y_slot3 = offsetTop + slotSpacing * 2;


  // --- 2. Gambar Background Putih (atau Frame tanpa overlay) ---
  // Background perlu di-gambar terlebih dahulu (opsional, jika tidak ada frame full)
  // Di sini kita langsung gambar frame dulu, tapi pastikan yang kosong.

  // --- 3. Gambar Semua Slot Foto (Async Handling) ---
  const slotsToDraw = [
      { id: "slot1", y: y_slot1 },
      { id: "slot2", y: y_slot2 },
      { id: "slot3", y: y_slot3 },
  ];
  let loadedImages = 0;
  
  // Fungsi utama untuk menggambar semua elemen secara berurutan
  function drawFinalResult() {
      
      // A. Gambar Background polos (atau area frame yang kosong)
      ctx.fillStyle = "#10163a"; // Warna background body
      ctx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);

      // B. Gambar Frame (Untuk mendapatkan dimensi/acuan) - Gambar di paling bawah sementara
      //ctx.drawImage(frameImg, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);

      // C. Gambar Foto (menggunakan fungsi drawCroppedImage)
      slotsToDraw.forEach(slot => {
          const imgElement = document.getElementById(slot.id);
          if (imgElement.src && !imgElement.src.includes('data:image/png;base64,')) {
              // Abaikan slot yang belum diisi
              return;
          }
          
          const imageToDraw = new Image();
          imageToDraw.onload = function() {
              // Gunakan fungsi drawCroppedImage untuk object-fit: cover (anti-distorsi)
              drawCroppedImage(ctx, imageToDraw, x_pos, slot.y, w_slot, slotHeight);
              loadedImages++;

              // D. Gambar Frame di paling atas setelah semua foto dimuat
              if (loadedImages === slotsToDraw.length) {
                   // Frame digambar ulang di paling atas (overlay)
                  ctx.drawImage(frameImg, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);

                  // Buat link download setelah semua selesai
                  const link = document.createElement("a");
                  link.download = "photobooth.png";
                  link.href = finalCanvas.toDataURL("image/png");
                  link.click();
              }
          }
          imageToDraw.src = imgElement.src;
      });
  }

  // Jika tidak ada foto yang diambil, pastikan tombol download tetap berfungsi (misalnya hanya frame)
  const hasPhotos = slotsToDraw.some(slot => document.getElementById(slot.id).src.includes('data:image/png;base64,'));
  
  if (hasPhotos) {
      drawFinalResult();
  } else {
      // Jika tidak ada foto, cukup gambar frame dan download
      ctx.drawImage(frameImg, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
      const link = document.createElement("a");
      link.download = "photobooth.png";
      link.href = finalCanvas.toDataURL("image/png");
      link.click();
  }
});
