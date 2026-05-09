import Konva from 'konva';

export function exportSVG(stageRef) {
  if (!stageRef?.current) return;
  const stage = stageRef.current;
  const firstLayer = stage.getLayers()[0];

  // Temporarily add white background rect to force white-background PNG
  const bg = new Konva.Rect({
    x: 0, y: 0,
    width: stage.width(), height: stage.height(),
    fill: 'white', listening: false,
  });
  firstLayer.add(bg);
  bg.moveToBottom();
  firstLayer.batchDraw();

  const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  const dataUrl = stage.toDataURL({ pixelRatio: 2 });

  bg.destroy();
  firstLayer.batchDraw();

  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `lejplau27-plan-${ts}.png`;
  a.click();
}
