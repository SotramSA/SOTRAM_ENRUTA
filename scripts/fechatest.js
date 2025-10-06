function getStartAndEndFromDateString(dateStr) {
  // Descomponer el string "YYYY-MM-DD"
  const [year, month, day] = dateStr.split("-").map(Number);

  // Crear inicio del día en UTC
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

  // Crear fin del día (día siguiente en UTC)
  const end = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));

  return {
    inicio: start.toISOString(),
    fin: end.toISOString()
  };
}

