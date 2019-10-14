//Pre required libraries
// 1. Paper Js https://cdnjs.cloudflare.com/ajax/libs/paper.js/0.12.2/paper-full.js
// 2. d3 Js https://d3js.org/d3.v4.min.js
// 3. dijkstra.js library. 


function CenterLine(path_org, PointsCount_value) 
{
    var test_path = path_org.clone();
    test_path.fullySelected = true;
    test_path.visible = true ;
    path_org.remove();
    var centerline = [];

    for(var i =0; i<test_path.children.length; i++)
    {
      try
      {
        var centerline_path = test_path.children[i].exportSVG();

        var polygon = getpolygon(centerline_path);
        
        var {polygon, edges} = drawVoronoi(polygon) 
        var new_edge = clipVoronoi({polygon, edges});
        var line = findCenterline(new_edge);

        centerline.push(line);
      }
      catch(e)
      {
          console.log("Error In CenterLine Js: " + e);
      }
          
    }
    return centerline;
}


function getpolygon(centerline_path)
{
  const svg = d3.select("svg").append("g");
  //console.log(centerline_path);
  const length = centerline_path.getTotalLength();

  const polygon = d3
    .range(PointsCount_value)
    .map(i => centerline_path.getPointAtLength(length * i / PointsCount_value))
    .map(d => [d.x, d.y]);

  return polygon;

}

function drawVoronoi(polygon) {
    const svg = d3.select("svg").append("g");
    const [x0, x1] = d3.extent(polygon.map(d => d[0])),
      [y0, y1] = d3.extent(polygon.map(d => d[1]));
  
    const voronoi = d3.voronoi().extent([[x0 - 1, y0 - 1], [x1 + 1, y1 + 1]])(polygon);
  
    const edges = voronoi.edges.filter(edge => {
      if (edge && edge.right) {
        const inside = edge.map(point => d3.polygonContains(polygon, point));
        if (inside[0] === inside[1]) {
          return inside[0];
        }
        if (inside[1]) {
          edge.reverse();
        }
        return true;
      }
      return false;
    });
    return { polygon, edges };
}


function clipVoronoi({ polygon, edges }) {
    edges.forEach(edge => {
      const [start, end] = edge;
  
      const { intersection, distance } = polygon.reduce((best, point, i) => {
        const intersection = findIntersection(start, end, point, polygon[i + 1] || polygon[0]);
        if (intersection) {
          const distance = distanceBetween(start, intersection);
          if (!best.distance || distance < best.distance) {
            return { intersection, distance };
          }
        }
        return best;
      }, {});
  
      if (intersection) {
        edge[1] = intersection;
        edge.distance = distance;
        edge[1].clipped = true;
      } else {
        edge.distance = distanceBetween(start, end);
      }
    });
    return edges;
  }
  
  // Construct a graph of the clipped edges
// For each pair of points, use Dijkstra's algorithm to find the shortest path
// We want the "longest shortest path" as the centerline
function findCenterline(edges) {

    const svg = d3.select("svg").append("g");
    const nodes = [];
  
    // Create links between Voronoi nodes in the least efficient way possible
    edges.forEach(edge => {
      edge.forEach((node, i) => {
        if (!i || !node.clipped) {
          const match = nodes.find(d => d === node);
          if (match) {
            return (node.id = match.id);
          }
        }
        node.id = nodes.length.toString();
        node.links = {};
        nodes.push(node);
      });
      edge[0].links[edge[1].id] = edge.distance;
      edge[1].links[edge[0].id] = edge.distance;
    });
  
    const graph = new Graph();
    
    nodes.forEach(node => {
      graph.addNode(node.id, node.links);
    });
    

    const perimeterNodes = nodes.filter(d => d.clipped);
    
    const longestShortest = perimeterNodes
      .reduce((totalBest, start, i) => {
        // Check all nodes above index i to avoid doubling up
        
        const path = perimeterNodes.slice(i + 1).reduce((nodeBest, node) => {
          const path = graph.path(node.id, start.id, { cost: true });
          
          if (!nodeBest.cost || path.cost > nodeBest.cost) {
            return path;
          }
          return nodeBest;
        }, {});
  
        if (!totalBest.cost || path.cost > totalBest.cost) {
          return path;
        }
        return totalBest;
      }, {}).path.map(id => nodes[+id]);
      
    return longestShortest;
  }



  function simplifyCenterline(centerline) {
    const svg = d3.select("svg").append("g");
    centerline = simplify(centerline.map(d => ({ x: d[0], y: d[1] })), 8).map(d => [d.x, d.y]);
  
    const smoothLine = d3.line().curve(d3.curveBasis);
  
    svg
      .append("path")
      .attr("id", "centerline")
      .attr("d", smoothLine(centerline))
      .each(function(d) {
        // Try to pick the right text orientation based on whether
        // the middle of the centerline is rtl or ltr
        const len = this.getTotalLength(),
          tangents = [
            tangentAt(this, len / 2),
            tangentAt(this, len / 2 - 50),
            tangentAt(this, len + 50)
          ];
  
        if (tangents.filter(t => Math.abs(t) > 90).length > tangents.length / 2) {
          centerline.reverse();
        }
      })
      .attr("d", smoothLine(centerline));
  }

  function drawCircle(sel) {
    sel
      .attr("cx", d => d[0])
      .attr("cy", d => d[1])
      .attr("r", 2.5);
  }
  
  function drawLineSegment(sel) {
    sel
      .attr("x1", d => d[0][0])
      .attr("x2", d => d[1][0])
      .attr("y1", d => d[0][1])
      .attr("y2", d => d[1][1])
      .attr("");
  
  }
  
  function findIntersection(a1, a2, b1, b2) {
    const uaT = (b2[0] - b1[0]) * (a1[1] - b1[1]) - (b2[1] - b1[1]) * (a1[0] - b1[0]),
      ubT = (a2[0] - a1[0]) * (a1[1] - b1[1]) - (a2[1] - a1[1]) * (a1[0] - b1[0]),
      uB = (b2[1] - b1[1]) * (a2[0] - a1[0]) - (b2[0] - b1[0]) * (a2[1] - a1[1]);
  
    if (uB !== 0) {
      const ua = uaT / uB,
        ub = ubT / uB;
      if (ua > 0 && ua < 1 && ub > 0 && ub < 1) {
        return [a1[0] + ua * (a2[0] - a1[0]), a1[1] + ua * (a2[1] - a1[1])];
      }
    }
  }
  
  function tangentAt(el, len) {
    const a = el.getPointAtLength(Math.max(len - 0.01, 0)),
      b = el.getPointAtLength(len + 0.01);
  
    return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
  }
  
  function distanceBetween(a, b) {
    const dx = a[0] - b[0],
      dy = a[1] - b[1];
  
    return Math.sqrt(dx * dx + dy * dy);
  }