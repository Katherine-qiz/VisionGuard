export function localDateKey(timestamp = Date.now()) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function utcDateKey(timestamp = Date.now()) {
    return new Date(timestamp).toISOString().slice(0, 10);
}
