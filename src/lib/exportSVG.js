export function exportSVG(stageRef) {
  if (!stageRef?.current) return;
  const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 });
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = 'lejplau27-plan.png';
  a.click();
}
