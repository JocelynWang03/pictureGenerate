export function createUploadRequests() {
  let bulkToken = 0;
  let gridVersion = 0;
  const slotTokens = Array(9).fill(0);
  return {
    beginBulk() {
      gridVersion += 1;
      bulkToken += 1;
      return bulkToken;
    },
    beginReorder() {
      gridVersion += 1;
      bulkToken += 1;
    },
    isBulkCurrent(token) { return token === bulkToken; },
    beginSlot(index) {
      if (!Number.isInteger(index) || index < 0 || index > 8) throw new RangeError('无效的九宫格位置');
      bulkToken += 1;
      slotTokens[index] += 1;
      return { gridVersion, slotToken: slotTokens[index] };
    },
    isSlotCurrent(index, request) {
      return request.gridVersion === gridVersion && request.slotToken === slotTokens[index];
    },
  };
}
