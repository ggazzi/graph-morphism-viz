import {Model} from './model';
import {Graph, TypeGraph, Morphism} from './graph';
import {GraphLayouter} from './graph-layout';

import * as GraphView from './graph-view';
import * as Form from './forms';

import {morphisms, graphs} from './examples';

function controlConfig(config: GraphLayouter.Configuration, morphism: Model) {
  const configForm = d3.select('form[name="config"]');

  Form.addCheckbox(configForm, config, 'layouterOn', 'Automatic Layout');

  Form.addCheckbox(configForm, config, 'autoCenter', 'Automatic Centering');

  Form.addDropdown(configForm, morphism, 'morphism', 'Rule', d3.keys(morphisms));

  Form.addSlider(configForm, config, 'gravityStrength', 'Gravity',
    d3.format('1.0e'),
    d3.scaleLog()
      .base(10)
      .domain([1e-5, 1])
      .range([0, 1])
  );

  Form.addSlider(configForm, config, 'nodeRepulsionStrength', 'Node Repulsion',
    d3.format('+04'),
    d3.scaleLinear()
      .domain([-0, -200])
      .range([0, 1])
  );

  Form.addSlider(configForm, config, 'edgeLength', 'Edge Length',
    d3.format('03'),
    d3.scaleLinear()
      .domain([0, 200])
      .range([0, 1])
  )

  Form.addSlider(configForm, config, 'edgeStrength', 'Edge Rigidity',
    d3.format('1.2g'),
    d3.scaleLinear()
      .domain([0, 1])
      .range([0, 1])
  );

  Form.addSlider(configForm, config, 'mappingConsistency', 'Mapping Consistency',
    d3.format('1.2g'),
    d3.scaleLinear()
      .domain([0, 1])
      .range([0, 1])
  );
}

const app = (<any>window).app = {
  run() {
    let firstMorphism = window.location.hash.slice(1) || 'callRequest';
    if (!(firstMorphism in morphisms)) {
      firstMorphism = 'callRequest';
    }
    window.location.hash = `#${firstMorphism}`;

    const svgCanvas = d3.select('#canvas');
    const morphismModel = new Model({'morphism': firstMorphism});

    const config = new GraphLayouter.Configuration();
    controlConfig(config, morphismModel);

    const arrowhead = new GraphView.Arrowhead(8, 8, <any>svgCanvas.append('defs'));

    morphismModel.onChange<string>('morphism', name => {
      window.location.hash = `#${name}`;
      showMorphism(morphisms[name], arrowhead, config)
    });

    showMorphism(morphisms[firstMorphism], arrowhead, config);
  },

  morphisms,
  currMorphism: morphisms.callRequest
}

function showMorphism(morphism: Morphism, arrowhead: any, config: any) {
  app.currMorphism = morphism;

  const layouter1 = GraphView.showGraph(d3.select('#graph1'), morphism.domain, morphism.mappingFromDomain, arrowhead, config, onDrag);
  const layouter2 = GraphView.showGraph(d3.select('#graph2'), morphism.codomain, morphism.mappingFromCodomain, arrowhead, config, onDrag);

  function onDrag() {
    layouter1.restart();
    layouter2.restart();
  }
}
