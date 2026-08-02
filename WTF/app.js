async function searchAndFilterNasabah() {
  const GAS_URL = "URL_WEB_APP_GOOGLE_SCRIPT_ANDA";
  const response = await fetch(GAS_URL + "?action=getNasabah");
  const resData = await response.json();
  const allData = resData.data;

  // Ambil nilai filter dari HTML
  const inputNik = document.getElementById('searchNik').value;
  const isAngsuranOver3 = document.getElementById('filterAngsuran3Bln').checked; // true/false
  const selectedApproval = document.getElementById('filterApproval').value; // 'YA', 'TIDAK', atau ''
  const isLimitOver1M = document.getElementById('filterLimit1M').checked; // true/false

  const filteredResult = allData.filter(item => {
    // 1. Match NIK
    const matchNik = !inputNik || String(item.NIK).includes(inputNik);
    
    // 2. Filter Angsuran > 3 Bulan
    const matchAngsuran = !isAngsuranOver3 || Number(item.AngsuranKe) > 3;
    
    // 3. Filter Status Approval
    const matchApproval = !selectedApproval || item.Approval === selectedApproval;
    
    // 4. Filter Limit Belum Terpakai > Rp 1.000.000 (SisaLimit = LimitKredit - JumlahPinjaman)
    const matchLimit = !isLimitOver1M || Number(item.SisaLimit) > 1000000;

    return matchNik && matchAngsuran && matchApproval && matchLimit;
  });

  renderTableData(filteredResult);
}