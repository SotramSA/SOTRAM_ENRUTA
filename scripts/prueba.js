'use-server'
function isoToTimeHHMM(isoString) {
  const date = new Date(isoString);
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Ejemplo
console.log(isoToTimeHHMM("2025-09-30T00:00:00.000Z")); // 00:00
console.log(isoToTimeHHMM("2025-09-30T14:35:00.000Z")); // 14:35

