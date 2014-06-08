
import MultiVisualization from 'asNEAT/multiVisualization';
import NetworkVisualization from 'asNEAT/networkVisualization';
import ForceVisualization from 'asNEAT/forceVisualization';
import LiveSpectrogram from 'asNEAT/liveSpectrogram';
var Visualizer = {};

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

Visualizer.createLiveSpectrogram = function(parameters) {
  return new LiveSpectrogram(parameters);
};

export default Visualizer;
