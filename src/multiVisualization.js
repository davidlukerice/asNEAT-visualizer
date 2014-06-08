var asNEAT = require('asNEAT/asNEAT')['default'],
    context = asNEAT.context;

var MultiVisualization = function(parameters) {
  _.defaults(this, parameters, this.defaultParameters);
  this.currentVisualization = this.visualizations[this.currentVisualizationIndex];
};
MultiVisualization.prototype.defaultParameters = {
  network: null,
  // (num) for px, or (string) for %
  width: "100%",
  height: 512,
  selector: '.multiVisualization',
  visualizations: [],
  currentVisualizationIndex: 0
};

MultiVisualization.prototype.init = function() {
  var self = this;
  _.forEach(this.visualizations, function(vis) {
    vis.selector = self.selector; 
    vis.init();
  });
};

MultiVisualization.prototype.start = function() {
  this.currentVisualization.start();
};

MultiVisualization.prototype.stop = function() {
  this.currentVisualization.stop();
};

MultiVisualization.prototype.refresh = function() {
  this.currentVisualization.refresh();
};

MultiVisualization.prototype.nextVisualization = function() {
  this.currentVisualization.stop();
  this.currentVisualizationIndex = (this.currentVisualizationIndex+1)%
                                      this.visualizations.length;
  this.currentVisualization = this.visualizations[this.currentVisualizationIndex];
  this.currentVisualization.start();
};

export default MultiVisualization;
