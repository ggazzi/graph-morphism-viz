import {Model} from './model';
import {Graph, GraphMapping, GraphMap} from './graph';
import {GraphLayouter} from './graph-layout';

export function showGraph(
      svgElement: d3.Selection<Element, {}, Element, any>,
      graph: Graph,
      morphism: GraphMapping,
      categories: GraphMap<number, number>,
      colors: d3.ScaleOrdinal<number, any>,
      arrowhead: Arrowhead,
      config: GraphLayouter.Configuration,
      onDrag: () => void
    ): GraphLayouter {

  viewCount++;

  svgElement.selectAll('.node, .edge').remove();
  svgElement.selectAll('.nodes, .edges').remove();

  const width  = +svgElement.attr('width'),
        height = +svgElement.attr('height');

  const layouter = new GraphLayouter(config, graph, morphism, width, height);

  const edgesView = new EdgesView(svgElement, d3.values(graph.edges), arrowhead, layouter.config, categories, colors);
  const nodesView = new NodesView(svgElement, d3.values(graph.nodes), layouter, categories, colors, () => {
    updateView();
    onDrag();
  });

  layouter.simulation.on('tick', updateView);
  return layouter;

  function updateView() {
    nodesView.refresh();
    edgesView.refresh();
  }
}

type D3Selection<Datum> = d3.Selection<Element, Datum, Element, {}>;

let viewCount = 0;

class NodesView {
  private nodesGroup: D3Selection<Graph.Node>

  /** Create an svg group showing the given nodes.
   *
   * Each node will be represented by an element 'g.node', which
   * contains the node's icon and outline.
   */
  constructor(container: D3Selection<{}>, nodes: Graph.Node[], layouter: GraphLayouter, categories: GraphMap<number, number>, colors: d3.ScaleOrdinal<number, any>, onDrag: () => void) {

    const nodesGroup = this.nodesGroup = container.append('g')
        .attr('class', 'nodes')
      .selectAll('.node')
        .data(nodes)
      .enter().append('g')
        .attr('class', 'node')
        .call(dragNodes(layouter, onDrag))
        .on('dblclick', node => {
          node.pinned = !node.pinned
        });

    const hasColors = layouter.config.get<boolean>('categoryColors');

    nodesGroup.each(function drawNode(node) {
      d3.select(this)
          .html(node.type.icon || `<circle r="${node.type.radius}"/>`)
        .append('circle')
          .attr('class', 'outline')
          .each(hasColors? setColor : removeColor)
          .attr('r', node.type.radius);
      d3.select(this)
        .append('text')
          .attr('class', 'node__category-label')
          .attr('transform', 'translate(-40,5)')
          .text(setLabel)
          .each(hasColors? setColorText : removeColor)
      d3.select(this)
        .append('text')
          .attr('class', 'node__pin-indicator')
          .attr('transform', 'translate(10,20)')
          .text('x')
    });

    layouter.config.onChange<boolean>(`categoryColors.viewNode${viewCount}`, hasColors => {
      nodesGroup.select('.outline')
        .each(hasColors? setColor : removeColor);
      nodesGroup.select('.node__category-label')
        .each(hasColors? setColorText : removeColor);
    });

    layouter.config.onChange<boolean>(`categoryLabels.viewNode${viewCount}`, hasColors => {
      nodesGroup.select('.node__category-label')
        .text(setLabel);
    });

    function setLabel(node: Graph.Node) {
      const category = categories.nodes[node.id];
      if (layouter.config.get<boolean>('categoryLabels') && typeof category !== 'undefined') {
        return `${category}:`;
      } else {
        return '';
      }
    }

    function setColor(node: Graph.Node) {
      const category = categories.nodes[node.id];
      if (typeof category !== 'undefined') {
        this.style.stroke = colors(category);
      } else {
        this.style.stroke = '';
      }
    }
    function setColorText(node: Graph.Node) {
      const category = categories.nodes[node.id];
      if (typeof category !== 'undefined') {
        this.style.stroke = colors(category);
        this.style.fill = colors(category);
      } else {
        this.style.stroke = '';
        this.style.fill = '';
      }
    }

    function removeColor() {
      this.style.stroke = '';
      this.style.fill = '';
    }
  }

  /** Update the visualization of the nodes. */
  refresh() {
    this.nodesGroup
        .attr('transform', node => `translate(${node.x}, ${node.y})`)
        .attr('class', node => node.pinned ? 'node node--pinned' : 'node');
  }
}

class EdgesView {
  private edgesGroup: D3Selection<Graph.Edge>
  private arrowhead: Arrowhead

  /** Create an svg group showing the givene dges.
   *
   * Each edge will be represented by an element 'g.edge', which contains
   * the edge's path and label.
   */
  constructor(container: D3Selection<{}>, edges: Graph.Edge[], arrowhead: Arrowhead, config: Model, categories: GraphMap<number, number>, colors: d3.ScaleOrdinal<number, any>) {
    this.arrowhead = arrowhead;

    const hasColors = config.get<boolean>('categoryColors');

    const edgesGroup = this.edgesGroup = container.append('g')
        .attr('class', 'edges')
      .selectAll('.edge')
        .data(edges)
      .enter().append('g')
        .attr('class', 'edge')
        .each(hasColors? setColor : removeColor);

    edgesGroup.append('path')
        .attr('class', '')
        .attr('marker-end', `url('#${arrowhead.markerId}')`);

    edgesGroup.append('text')
        .text(setLabel);

    config.onChange<boolean>(`categoryColors.viewEdge${viewCount}`, hasColors => {
      edgesGroup.each(hasColors? setColor : removeColor);
    });

    config.onChange<boolean>(`categoryLabels.viewEdge${viewCount}`, () => {
      edgesGroup.select('text').text(setLabel);
    });

    function setLabel(edge: Graph.Edge) {
      const category = categories.edges[edge.id];
      if (config.get<boolean>(`categoryLabels`) && typeof category !== 'undefined') {
        return `${category}: ${edge.type.name}`;
      } else {
        return edge.type.name;
      }
    }

    function setColor(edge: Graph.Edge) {
      const category = categories.edges[edge.id];
      if (typeof category !== 'undefined') {
        const color = colors(category);
        this.style.stroke = color;
        this.style.fill = color;
      } else {
        this.style.stroke = '';
        this.style.fill = '';
      }
    }

    function removeColor() {
      this.style.stroke = '';
      this.style.fill = '';
    }
  }

  refresh() {
    this.edgesGroup.select('path').attr('d', edge => this.calculatePath(edge));

    this.edgesGroup.select('text')
        .each(function(edge) {
          // We must first update from screen, in order to reposition the label appropriately
          EdgesView.updateLabelFromScreen(<any>this, edge);
        })
        .attr('transform', edge => this.calculateLabelTransform(edge));
  }

  /** Calculates the path of the edge.
   *
   * Must reduce the path length compensating for:
   *  - node radius
   *  - node border
   *  - arrowhead length
   */
  private calculatePath(edge: Graph.Edge) {
    const delta = edge.target.point.distanceFrom(edge.source.point);
    const norm = delta.scaleBy(1/delta.norm);

    const sourcePadding = edge.source.type.radius + 3, // border width
          targetPadding = edge.target.type.radius + .6 * this.arrowhead.edgePadding + 3; // border width

    const source = edge.source.point.add(norm.scaleBy(sourcePadding));
    const target = edge.target.point.sub(norm.scaleBy(targetPadding))

    return `M${source.x},${source.y} L${target.x},${target.y}`;
  }

  private calculateLabelTransform(edge: Graph.Edge) {
    const location = edge.labelPos;
    return `translate(${location.x},${location.y})`;
  }

  private static updateLabelFromScreen(text: SVGLocatable, edge: Graph.Edge) {
    const bbox = text.getBBox();
    edge.labelSize.width = bbox.width;
    edge.labelSize.height = bbox.height;
  }
}

function dragNodes(layouter: GraphLayouter, dragCallback: () => void) : d3.DragBehavior<Element, Graph.Node> {
  return d3.drag<Element, Graph.Node>()
    .on('start', node => {
      if (!dragEvent().active) layouter.restart().simulation.alphaTarget(0.3);
      node.dragging = true;
    })
    .on('drag', node => {
      node.x = dragEvent().x;
      node.y = dragEvent().y;
      dragCallback();
    })
    .on('end', node => {
      if (!dragEvent().active) layouter.simulation.alphaTarget(0);
      node.dragging = false;
    });
}

function dragEvent<GElement extends Element, Datum>() : d3.D3DragEvent<GElement, Datum> {
  return <any>d3.event;
}

const MARKER_REFX_MULT = 0.6;

export class Arrowhead {
  private marker: d3.Selection<SVGMarkerElement, {}, Element, {}>;
  private size: {width: number, height: number};

  get width(): number { return this.size.width; }
  get height(): number { return this.size.height; }
  get markerId(): string { return this.marker.attr('id'); }

  get edgePadding(): number { return this.size.width * (1 - MARKER_REFX_MULT)}

  constructor(width: number, height: number, defs: d3.Selection<SVGDefsElement, {}, Element, {}>) {
    this.size = {width, height};

    this.marker = <any>defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', MARKER_REFX_MULT * 10)
      .attr('markerWidth', width)
      .attr('markerHeight', height)
      .attr('orient', 'auto');

    this.marker.append('svg:path')
      .attr('d', `M0,${-height/2} L${width},0 L0,${height/2}`)
      .attr('stroke-width', 0);
  }
}
