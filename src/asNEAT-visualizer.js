
import MultiVisualization from 'asNEAT/multiVisualization';
import NetworkVisualization from 'asNEAT/networkVisualization';
import ForceVisualization from 'asNEAT/forceVisualization';
import OfflineSpectrogram from 'asNEAT/offlineSpectrogram';
import LiveSpectrogram from 'asNEAT/liveSpectrogram';
import InstrumentVisualization from 'asNEAT/instrumentVisualization';

var oldAnimationTimestamp = null;
var requestAnimationHandlerIds = 0;
var registeredAnimationFrameHandlers = {};
function renderVisualizationFrame(timestamp) {
  if (!oldAnimationTimestamp) oldAnimationTimestamp = timestamp;
  var deltaTime = timestamp - oldAnimationTimestamp;
  _.forEach(registeredAnimationFrameHandlers, function(handler) {
    handler();
  });
  window.requestAnimationFrame(renderVisualizationFrame);
}
window.requestAnimationFrame(renderVisualizationFrame);

var Visualizer = {};

Visualizer.registerRequestAnimationHandler = function(handler) {
  var id = ++requestAnimationHandlerIds;
  registeredAnimationFrameHandlers[id] = handler;
  return id;
};
Visualizer.unregisterRequestAnimationHandler = function(id) {
  delete registeredAnimationFrameHandlers[id];
};

Visualizer.createInstrumentVisualization = function(parameters) {
    return new InstrumentVisualization(parameters);
};

Visualizer.createMultiVisualization = function(parameters) {

  // TODO: Create other visualizations and pass them in
  var visualizations = [];
  visualizations.push(Visualizer.createLiveSpectrogram(parameters));
  visualizations.push(Visualizer.createForceVisualization(parameters));
  parameters.visualizations = visualizations;

  return new MultiVisualization(parameters);
};

Visualizer.createNetworkVisualization = function(parameters) {
  return new NetworkVisualization(parameters);
};

Visualizer.createForceVisualization = function(parameters) {
  return new ForceVisualization(parameters);
};

Visualizer.createOfflineSpectrogram = function(parameters) {
	return new OfflineSpectrogram(parameters);
};

Visualizer.createLiveSpectrogram = function(parameters) {
  return new LiveSpectrogram(parameters);
};

export default Visualizer;

// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
// MIT license
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] ||
                                      window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());
// ********** end polyfill ************
