var asNEAT = require('asNEAT/asNEAT')['default'],
    context = asNEAT.context;

// Workaround for garbageCollected jsNodes
// http://sriku.org/blog/2013/01/30/taming-the-scriptprocessornode/#replacing-gain-node-with-scriptprocessornode
var scriptNodes = {};
var keep = (function() {
  var nextNodeID = 1;
  return function(node) {
    node.id = node.id || (nextNodeID++);
    scriptNodes[node.id] = node;
    return node;
  };
}());
var drop = function(node) {
  delete scriptNodes[node.id];
  return node;
};

var OfflineSpectrogram = function(parameters) {
  _.defaults(this, parameters, this.defaultParameters);
  var self = this;

  var outNode = this.network.nodes[0];
  // TODO: Drop at some point?
  var jsNode = keep(context.createScriptProcessor(2048, 1, 1));
  jsNode.connect(context.destination);
  
  var analyser = context.createAnalyser();
  analyser.smoothingTimeConstant = 0;
  analyser.fftSize = this.fftSize;

  outNode.node.connect(analyser);
  analyser.connect(jsNode);  

  var canvas = document.createElement('canvas'),
      ctx = canvas.getContext('2d'),
      tempCanvas = document.createElement('canvas'),
      tempCtx = tempCanvas.getContext('2d');
  // TODO: Update with params
  canvas.width = 800;
  canvas.height = 512;
  tempCanvas.width = 800;
  tempCanvas.height = 512;
  this.canvas = canvas;
  this.ctx = ctx;
  this.tempCanvas = tempCanvas;
  this.tempCtx = tempCtx;

  $(this.selector).append(canvas);

  jsNode.onaudioprocess = function() {

    var array = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(array);

    var isPlaying = _.reduce(self.network.getOscillatorNodes(), function(result, val) {
      return result || (val.node && val.node.playbackState === val.node.PLAYING_STATE);
    }, false);

    if (isPlaying)
      self.refresh(array);
  };

  if (this.colorScale === null) {
    this.colorScale = new chroma.scale(
      ['#000000', '#ff0000', '#ffff00', '#ffffff'],
      [0, 0.25, 0.75, 1]);
    this.colorScale.domain([0, 300]);
  }

};
OfflineSpectrogram.prototype.defaultParameters = {
  network: null,
  // (num) for px, or (string) for %
  width: "100%",
  height: 600,
  selector: '.offlineSpectrogram',

  // number of frequency bands in the y direction
  // TODO: Update based on height*2?
  fftSize: 1024,

  // the colors used in the vis
  colorScale: null
};

/**
  @param freqData {Uint8Array}
*/
OfflineSpectrogram.prototype.refresh = function(freqData) {
  var canvas = this.canvas,
      tempCanvas = this.tempCanvas,
      tempCtx = this.tempCtx,
      ctx = this.ctx,
      colorScale = this.colorScale,
      i, len, val;

  tempCtx.drawImage(canvas, 0, 0, 800, 512);
  for (i=0,len = freqData.length; i<len; ++i) {
    val = freqData[i];
    ctx.fillStyle = colorScale(val).hex();
    //console.log(val+' --> '+ctx.filStyle);
    ctx.fillRect(800-1, 512-i, 1, 1);
  }

  ctx.translate(-1, 0);
  ctx.drawImage(tempCanvas, 0, 0, 800, 512, 0, 0, 800, 512);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
};

export default OfflineSpectrogram;
