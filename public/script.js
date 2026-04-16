// ================== NAVIGATION & UI ==================

// ฟังก์ชันเปลี่ยนหน้าภายในไฟล์เดียวกัน (ถ้ามีการใช้ ID แยกหน้า)
function changeTab(page, el) {
  const allPages = ["homePage", "scanPage", "historyPage", "guidePage"];
  allPages.forEach(p => {
    const pageElement = document.getElementById(p);
    if (pageElement) pageElement.style.display = "none";
  });

  const targetPage = document.getElementById(page + "Page");
  if (targetPage) targetPage.style.display = "block";

  if (el) {
    document.querySelectorAll(".nav-item").forEach(t => t.classList.remove("active"));
    el.classList.add("active");
  }
}

// ฟังก์ชันเปลี่ยนไฟล์ HTML
function go(page) {
  window.location.href = page;
}

// ================== FILE & UPLOAD ==================

// ฟังก์ชันเปิดหน้าต่างเลือกไฟล์
function openFile() {
  const fileInput = document.getElementById('fileInput');
  if (fileInput) fileInput.click();
}

// ข้อมูลคำแนะนำเฉพาะโรค
const diseaseAdvice = {
  "โรคใบจุด": [
    "ตัดใบที่มีรอยโรคไปเผาทำลายนอกแปลงเพื่อป้องกันเชื้อราลุกลาม",
    "ปรับสภาพแปลงให้โปร่ง อากาศถ่ายเทได้ดี ลดความชื้นสะสม",
    "หากระบาดหนัก ให้พิจารณาใช้สารชีวภัณฑ์หรือสารเคมีกำจัดเชื้อราตามคำแนะนำ"
  ],
  "ไวรัสโมสาก": [
    "ถอนต้นที่ติดเชื้อไปเผาทำลายทันที (เนื่องจากโรคไวรัสไม่มียารักษาโดยตรง)",
    "ล้างมือและทำความสะอาดอุปกรณ์ทุกครั้งก่อนไปสัมผัสต้นที่ปกติ",
    "กำจัดวัชพืชและควบคุมแมลงพาหะ (เช่น เพลี้ยอ่อน หรือแมลงหวี่ขาว) ในบริเวณแปลง"
  ],
  "ใบปกติ": [
    "ต้นยาสูบมีสุขภาพดี ไม่พบร่องรอยของโรค",
    "ดูแลรดน้ำและให้ธาตุอาหารตามระยะการเจริญเติบโตตามปกติ",
    "หมั่นสำรวจแปลงอย่างสม่ำเสมอเพื่อเฝ้าระวังโรคและแมลง"
  ],
  
  "โรคใบเหี่ยว": [
    "ถอนต้นที่แสดงอาการเหี่ยวออกทันทีเพื่อป้องกันการแพร่กระจาย",
    "ตรวจสอบระบบน้ำและความชื้นในดิน เนื่องจากอาจมีเชื้อราในดินเป็นสาเหตุ",
    "หลีกเลี่ยงการปลูกซ้ำในพื้นที่เดิม และพิจารณาใช้สารฆ่าเชื้อในดินก่อนปลูกรอบใหม่"
  ]
};

// ฟังก์ชันหลักในการจัดการไฟล์และการวิเคราะห์ AI
async function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const resultBox = document.getElementById('resultBox');
  if (!resultBox) {
    console.error("❌ ไม่พบ element 'resultBox' ในหน้านี้");
    return;
  }

  // 1. แสดงภาพตัวอย่างและสถานะกำลังโหลด
  const imgURL = URL.createObjectURL(file);
  resultBox.innerHTML = `
    <div style="text-align: center;">
      <img src="${imgURL}" style="max-width: 100%; max-height: 250px; border-radius: 8px; margin-bottom: 15px;" />
      <h3 id="loadingText" style="color: #666;">⏳ กำลังวิเคราะห์ผลด้วย AI...</h3>
    </div>
  `;

  // 2. เตรียมข้อมูลไฟล์ส่งไป Python Backend (AI API)
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("http://localhost:8000/predict", {
      method: "POST",
      body: formData
    });

//const response = await fetch("https://model-of-4-diseases.onrender.com/predict", {

    if (!response.ok) throw new Error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ AI ได้");
    const data = await response.json();
    
    const confidenceNum = parseFloat(data.confidence);
    const disease = data.disease;
    let shouldSaveToSupabase = false; // ตัวแปรคุมการบันทึกข้อมูล

    // 3. ตรวจสอบเงื่อนไขเปอร์เซ็นต์และแสดงผลลัพธ์ (แก้ไขใหม่: มีแค่ >= 80% และ < 80%)
    if (confidenceNum >= 80) {
      // 🟢 1. มากกว่าหรือเท่ากับ 80% → แสดงผล + บันทึก
      shouldSaveToSupabase = true;
      const adviceList = (diseaseAdvice[disease] || ["โปรดตรวจสอบอาการเพิ่มเติม"]).map(item => `<li>${item}</li>`).join('');
      
      resultBox.innerHTML = `
        <div style="text-align: left; background-color: #eafaf1; border: 2px solid #27ae60; border-radius: 12px; padding: 20px;">
          <div style="text-align: center; margin-bottom: 15px;">
            <img src="${imgURL}" style="max-width: 100%; max-height: 250px; border-radius: 8px;" />
          </div>
          <h3 style="color: #27ae60; margin-top: 0;">ผลการตรวจจับ: ${disease}</h3>
          <p style="margin: 5px 0;">ความมั่นใจ: <b>${data.confidence}%</b></p>
          <hr style="border: 0.5px solid #a3e4d7; margin: 15px 0;">
          <p style="margin-top: 0; color: #2c3e50;"><b>💡 คำแนะนำ:</b></p>
          <ul style="padding-left: 20px; color: #34495e; line-height: 1.6;">
            ${adviceList}
          </ul>
        </div>
      `;

    } else {
      // 🔴 2. น้อยกว่า 80% → สีแดง ตรวจไม่พบใบยาสูบ (ไม่บันทึก)
      shouldSaveToSupabase = false;
      resultBox.innerHTML = `
        <div style="text-align: left; background-color: #fdedec; border: 2px solid #e74c3c; border-radius: 12px; padding: 20px;">
          <div style="text-align: center; margin-bottom: 15px;">
            <img src="${imgURL}" style="max-width: 100%; max-height: 250px; border-radius: 8px;" />
          </div>
          <h3 style="color: #c0392b; margin-top: 0;">❌ ตรวจไม่พบใบยาสูบ</h3>
          <p style="margin: 5px 0;">ความมั่นใจ: <b>${data.confidence}%</b> (ต่ำกว่าเกณฑ์ที่กำหนด)</p>
          <hr style="border: 0.5px dashed #f5b7b1; margin: 15px 0;">
          <p style="margin-top: 0; color: #555; font-size: 0.9em;"><b>คำแนะนำ:</b> ระบบไม่มั่นใจว่านี่คือใบยาสูบ หรือภาพอาจไม่ชัดเจน กรุณาตรวจสอบดังนี้:</p>
          <ul style="padding-left: 20px; color: #555; line-height: 1.6; font-size: 0.9em;">
            <li>📸 ถ่ายเฉพาะใบยาสูบให้ชัดเจน</li>
            <li>☀️ ถ่ายในที่แสงสว่างเพียงพอ</li>
            <li>🚫 ระวังอย่าให้ภาพเบลอ หรือมีสิ่งอื่นบัง</li>
          </ul>
          <div style="text-align: center; margin-top: 15px;">
             <button onclick="openFile()" style="padding: 10px 20px; border-radius: 8px; border: none; background-color: #e74c3c; color: white; cursor: pointer;">📷 ถ่ายภาพใหม่อีกครั้ง</button>
          </div>
        </div>
      `;
    }

   // 4. กระบวนการบันทึกลง Supabase (ทำเฉพาะเมื่อ shouldSaveToSupabase เป็น true)
    if (shouldSaveToSupabase && typeof supabaseClient !== 'undefined') {
      console.log("🚀 เริ่มกระบวนการบันทึกลง Supabase 2 ฝั่ง...");
      
      const { data: authData } = await supabaseClient.auth.getUser();
      const userId = authData?.user?.id || null;

      // ตั้งชื่อไฟล์ให้เหมือนกันสำหรับทั้ง 2 โฟลเดอร์
      const fileName = `${Date.now()}_${file.name || 'camera_capture.png'}`;

      // =========================================================
      // 🟢 ฝั่งที่ 1: อัปโหลดสำหรับ User (ลงโฟลเดอร์ history_images -> ตาราง scans)
      // =========================================================
      const { error: userUploadError } = await supabaseClient.storage
        .from('history_images')
        .upload(fileName, file);

      if (userUploadError) {
        console.error("❌ User Storage Upload Error:", userUploadError.message);
        return; // ถ้าอัปโหลดฝั่ง User ไม่ผ่าน ให้หยุดการทำงาน
      }

      // ดึง URL และบันทึกลงตาราง scans
      const { data: userUrlData } = supabaseClient.storage.from('history_images').getPublicUrl(fileName);
      const userImageUrl = userUrlData.publicUrl;

      const { error: userInsertError } = await supabaseClient
        .from('scans') 
        .insert([{
          user_id: userId,
          disease: data.disease,
          confidence: `${data.confidence}%`,
          image_url: userImageUrl
        }]);

      if (userInsertError) console.error("❌ User DB Insert Error:", userInsertError.message);


      // =========================================================
      // 🔴 ฝั่งที่ 2: อัปโหลดสำหรับ Admin (ลงโฟลเดอร์ history_admin_images -> ตาราง admin_scans)
      // =========================================================
      const { error: adminUploadError } = await supabaseClient.storage
        .from('history_admin_images')
        .upload(fileName, file);

      if (adminUploadError) {
        console.error("❌ Admin Storage Upload Error:", adminUploadError.message);
      } else {
        // ดึง URL และบันทึกลงตาราง admin_scans
        const { data: adminUrlData } = supabaseClient.storage.from('history_admin_images').getPublicUrl(fileName);
        const adminImageUrl = adminUrlData.publicUrl;

        const { error: adminInsertError } = await supabaseClient
          .from('admin_scans') 
          .insert([{
            user_id: userId,
            disease: data.disease,
            confidence: `${data.confidence}%`,
            admin_image_url: adminImageUrl
          }]);

        if (adminInsertError) console.error("❌ Admin DB Insert Error:", adminInsertError.message);
      }

      // =========================================================
      console.log("✅ บันทึกประวัติลง Database ทั้ง User และ Admin สำเร็จ!");
      if (typeof loadHistory === 'function') loadHistory();

    } else if (!shouldSaveToSupabase) {
      console.log("⚠️ ความมั่นใจต่ำกว่า 80% - ยกเลิกการบันทึกลง Supabase");
    }

  } catch (error) {
    console.error("❌ Error ในกระบวนการ handleFile:", error);
    resultBox.innerHTML = `
      <div style="text-align: center;">
        <h3 style="color: red;">❌ เกิดข้อผิดพลาด</h3>
        <p>กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต หรือรัน Backend แล้วหรือยัง</p>
        <button onclick="openFile()" style="margin-top: 10px; padding: 8px 16px; border-radius: 5px; cursor:pointer; background-color: #f0f0f0; border: 1px solid #ccc;">ลองใหม่อีกครั้ง</button>
      </div>
    `;
  }
}


// ================== USER & SUPABASE ==================

/**
 * ฟังก์ชันจัดการแถบเมนูด้านล่าง (ให้สีฟ้าติดอยู่ตรงหน้าปัจจุบัน)
 */
function updateNavActiveState() {
  // 1. ดึงชื่อไฟล์ปัจจุบัน (ถ้าหน้าหลักจะเป็นค่าว่าง ให้เป็น index.html)
  let currentPage = window.location.pathname.split('/').pop();
  if (!currentPage || currentPage === "") {
    currentPage = 'index.html';
  }

  document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
    // 2. ล้างคลาส active ออกจากทุกปุ่มก่อน
    item.classList.remove('active');
    
    // 3. ปรับไอคอนทุกตัวให้กลับเป็นแบบเส้นขอบ (ลบ ph-fill ออก เปลี่ยนเป็น ph)
    const icon = item.querySelector('i');
    if (icon && icon.className.includes('ph-fill')) {
      icon.className = icon.className.replace('ph-fill', 'ph');
    }

    // 4. เช็คว่าปุ่มนี้ตรงกับหน้าปัจจุบันไหม
    const onclickAttr = item.getAttribute('onclick');
    if (onclickAttr && onclickAttr.includes(currentPage)) {
      
      // ถ้าตรงกัน ให้ล็อกสีฟ้าไว้ (เติมคลาส active)
      item.classList.add('active');
      
      // และเปลี่ยนไอคอนให้เป็นแบบทึบ (ph-fill)
      if (icon) {
        icon.className = icon.className.replace('ph ', 'ph-fill ');
      }
    }
  });
}

/**
 * ฟังก์ชันเริ่มต้นหน้าเว็บ: โหลดข้อมูลพื้นฐานทั้งหมด
 */
async function initPage() {
  if (typeof checkUser === 'function') await checkUser(); 
  await loadUser();
  await loadHistory();
  if (typeof setDate === 'function') setDate();
  updateNavActiveState();
}

/**
 * โหลดข้อมูลผู้ใช้ที่ Login อยู่มาแสดงบนหน้าจอ
 */
async function loadUser() {
  if (typeof supabaseClient === 'undefined') return;
  
  const { data, error } = await supabaseClient.auth.getUser();

  if (data && data.user) {
    const usernameEl = document.getElementById("username");
    if (usernameEl) {
      usernameEl.innerText = data.user.email.split('@')[0]; 
    }
  }
}

/**
 * ฟังก์ชันหลักในการดึงประวัติการสแกนจากตาราง 'scans'
 */
async function loadHistory() {
  if (typeof supabaseClient === 'undefined') {
    console.warn("⚠️ supabaseClient ไม่ทำงาน: ตรวจสอบการใส่ URL/Key ในหน้า HTML");
    return;
  }

  console.log("🔄 กำลังดึงข้อมูลประวัติ...");

  const { data: authData } = await supabaseClient.auth.getUser();
  const userId = authData?.user?.id || null;

  let query = supabaseClient.from("scans").select("*");

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("❌ เกิดข้อผิดพลาดในการโหลดประวัติ:", error.message);
    return;
  }

  const box = document.getElementById("historyList"); 
  const all = document.getElementById("historyAll");  

  if (box) box.innerHTML = "";
  if (all) all.innerHTML = "";

  if (data && data.length > 0) {
    data.forEach(item => {
      // (เปลี่ยน HTML Template ให้ตรงกับดีไซน์ใหม่)
      const html = `
        <div class="history-item" style="display: flex; align-items: center; background: #fbf9f6; padding: 15px; border-radius: 15px; margin-bottom: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.02); gap: 15px;">
          <img src="${item.image_url}" style="width: 70px; height: 70px; border-radius: 10px; object-fit: cover; margin-right: 0;" onerror="this.src='https://via.placeholder.com/70?text=No+Img'">
          <div style="flex-grow: 1;">
            <p style="margin: 0; font-weight: bold; color: #2c3e50; font-size: 1.1rem;">${item.disease}</p>
            <small style="color: #8c969e;">ความมั่นใจ: ${item.confidence}</small>
          </div>
          <div style="font-size: 0.75rem; color: #a3b18a; text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
            <div>
              ${new Date(item.created_at).toLocaleDateString('th-TH')}<br>
              ${new Date(item.created_at).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
            </div>
            <button onclick="deleteHistory('${item.id}', '${item.image_url}')" style="background-color: #fff5f5; color: #f1948a; border: 1px solid #ffe8e8; padding: 5px 12px; border-radius: 20px; cursor: pointer; display: flex; align-items: center; gap: 5px; font-size: 0.8rem; font-weight: 600;">
              🗑️ ลบ
            </button>
          </div>
        </div>
      `;
      if (box) box.innerHTML += html;
      if (all) all.innerHTML += html;
    });

    const totalScanEl = document.getElementById("totalScan");
    if (totalScanEl) totalScanEl.innerText = data.length;

    const healthyCount = data.filter(item => 
      item.disease.toLowerCase().includes('healthy') || item.disease.includes('ปกติ')
    ).length;
    const infectedCount = data.length - healthyCount;

    const healthyEl = document.querySelector('.sum-box:not(.red) b');
    const infectedEl = document.querySelector('.sum-box.red b');
    
    if (healthyEl) healthyEl.innerText = healthyCount;
    if (infectedEl) infectedEl.innerText = infectedCount;

    const scoreEl = document.querySelector('.score h2');
    if (scoreEl) {
      const score = Math.round((healthyCount / data.length) * 100);
      scoreEl.innerText = score + "%";
    }

  } else {
    const noData = "<div style='text-align:center; color:#999; padding:20px;'>ยังไม่มีประวัติการสแกน</div>";
    if (box) box.innerHTML = noData;
    if (all) all.innerHTML = noData;
  }
}

// ================== HANDLE CAMERA CAPTURE ==================

window.addEventListener("DOMContentLoaded", async () => {
  const capturedImage = localStorage.getItem("capturedImage");
  
  if (capturedImage) {
    localStorage.removeItem("capturedImage");

    try {
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const file = new File([blob], `camera_${Date.now()}.png`, { type: "image/png" });

      const fakeEvent = { target: { files: [file] } };
      await handleFile(fakeEvent);
      
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการดึงรูปจากกล้อง:", error);
    }
  }
});


// ================== DELETE HISTORY ==================
async function deleteHistory(scanId, imageUrl) {
  if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบประวัตินี้? ข้อมูลและรูปภาพจะถูกลบถาวร")) {
    return;
  }

  try {
    // 1. ลบข้อมูลออกจากตาราง 'scans'
    const { error: dbError } = await supabaseClient
      .from('scans')
      .delete()
      .eq('id', scanId);

    if (dbError) throw dbError;

    // 2. สกัดชื่อไฟล์จาก URL เพื่อไปลบใน Storage
    if (imageUrl) {
      const urlParts = imageUrl.split('/');
      const fileName = decodeURIComponent(urlParts[urlParts.length - 1]); 

      const { error: storageError } = await supabaseClient
        .storage
        .from('history_images')
        .remove([fileName]);

      if (storageError) {
        console.warn("⚠️ ลบรูปใน Storage ไม่สำเร็จ:", storageError.message);
      }
    }

    // 3. แจ้งเตือนและรีเฟรชหน้าเว็บ
    alert("✅ ลบประวัติและรูปภาพเรียบร้อยแล้ว!");
    
    // 🚀 เปลี่ยนมาใช้คำสั่งนี้ เพื่อบังคับหน้าเว็บให้รีเฟรชตัวเอง
    window.location.reload(); 

  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาดในการลบประวัติ:", error);
    alert("ลบข้อมูลไม่สำเร็จ: " + error.message);
  }
}

// ================== AUTHENTICATION (LOGOUT) ==================

async function logout() {
  if (typeof supabaseClient === 'undefined') {
    console.error("❌ ไม่พบการเชื่อมต่อ Supabase");
    localStorage.clear();
    // เปลี่ยนจาก 'index.html' เป็นหน้าล็อคอิน
    window.location.href = 'login.html'; 
    return;
  }

  if (!confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) return;

  try {
    const { error } = await supabaseClient.auth.signOut();
    
    if (error) throw error;

    console.log("✅ ออกจากระบบสำเร็จ");
    
    localStorage.clear();
    sessionStorage.clear();

    alert("ออกจากระบบเรียบร้อยแล้ว");
    // 🟢 แก้ไขตรงนี้: ให้เด้งไปที่หน้า Login
    window.location.href = 'login.html';

  } catch (error) {
    console.error("❌ Logout Error:", error.message);
    localStorage.clear();
    // 🟢 แก้ไขตรงนี้ด้วยเผื่อเกิด error
    window.location.href = 'login.html';
  }
}