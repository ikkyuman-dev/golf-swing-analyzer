export const POSE_CONNECTIONS = [
  [11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],
  [23,25],[25,27],[27,29],[29,31],[24,26],[26,28],[28,30],[30,32]
];

export function jointAngle(a, b, c) {
  if (![a, b, c].every(Boolean)) return null;
  const ab = Math.atan2(a.y - b.y, a.x - b.x);
  const cb = Math.atan2(c.y - b.y, c.x - b.x);
  let degrees = Math.abs((ab - cb) * 180 / Math.PI);
  if (degrees > 180) degrees = 360 - degrees;
  return degrees;
}

export function lineTilt(left, right) {
  if (!left || !right) return null;
  return Math.atan2(right.y - left.y, right.x - left.x) * 180 / Math.PI;
}

export function poseMetrics(points) {
  return {
    shoulder: lineTilt(points[11], points[12]),
    hip: lineTilt(points[23], points[24]),
    leftElbow: jointAngle(points[11], points[13], points[15]),
    rightElbow: jointAngle(points[12], points[14], points[16]),
    leftKnee: jointAngle(points[23], points[25], points[27]),
    rightKnee: jointAngle(points[24], points[26], points[28])
  };
}
