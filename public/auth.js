// auth.js

const SUPABASE_URL = "https://bdzquuqxtmrrmgdtwdjq.supabase.co";
const SUPABASE_KEY = "sb_publishable_mqlTN61NRe9P67p33ES6ag_7yKtEXpx";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ================= REGISTER =================
async function register() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("กรอกข้อมูลให้ครบ");
    return;
  }

  // 1. สมัครสมาชิกผ่านระบบ Auth ของ Supabase
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) {
    alert("สมัครไม่สำเร็จ: " + error.message);
    return;
  }

  // 🚀 2. เพิ่มโค้ดส่วนนี้: บันทึกข้อมูลลงตาราง users ของเราด้วย!
  if (data && data.user) {
    const { error: insertError } = await supabaseClient
      .from('users')
      .insert([
        { 
          id: data.user.id, 
          email: data.user.email, 
          role: 'user' // กำหนดสิทธิ์เริ่มต้นเป็น user ทั่วไป
        }
      ]);

    if (insertError) {
      console.error("❌ ไม่สามารถบันทึกลงตาราง users ได้:", insertError.message);
    }
  }

  // 3. แจ้งเตือนและเปลี่ยนหน้า
  if (data.user && !data.session) {
    alert("สมัครสำเร็จ! (ต้องยืนยันอีเมล)");
  } else {
    alert("สมัครสำเร็จ! กำลังเข้าสู่ระบบ...");
    window.location.href = "index.html";
  }
}

// ================= LOGIN =================
async function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("กรอกข้อมูลให้ครบ");
    return;
  }

  // 1. ส่งคำขอเข้าสู่ระบบ
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert("เข้าสู่ระบบไม่สำเร็จ: " + error.message);
  } else {
    // 2. ดึงข้อมูล Role จากตาราง users
    const { data: userData, error: roleError } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single();

    // 3. แยกทาง (Routing) ตาม Role
    if (userData && userData.role === 'admin') {
      window.location.href = "admin.html"; // 👑 ถ้าเป็นแอดมิน ไปหน้า admin
    } else {
      window.location.href = "index.html"; // 👤 ถ้าเป็นผู้ใช้ทั่วไป ไปหน้าแรก
    }
  }
}

// ================= CHECK USER =================
async function checkUser() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (!data?.user) {
    window.location.href = "login.html";
  }
}

// ================= LOGOUT =================
async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
}