
var draw = SVG(document.querySelector('#drawing')).size(1000, 1000)


var simplifyslider = document.getElementById("simplify_slider"); 
var simplify_slider = simplifyslider.value;
var flatterslider = document.getElementById("flatten_slider"); 
var flatten_slider = flatterslider.value;
var PointsCount = document.getElementById("PointsCount"); 
var PointsCount_value = PointsCount.value;
var canvas = document.getElementById('Canvas')
var scope = paper.setup(canvas)
var path = new paper.Path();


var svgtoextract = ""
var children;

var url = "";
var item;


var update_item;

function paperjs(url)
{
    paper.project.importSVG(url, function(item) {
        path = item;
        path.scale(0.5)
        path.position = new paper.Point(path.bounds.width/2, path.bounds.height/2)
        path.visible = false ;
        PointsCount_value = 20;
        //simplify(simplify_slider, flatten_slider)
        dosomething(path, url, PointsCount_value);
        
    });
}



function dosomething(path, PointsCount_value)
{
  
  var test_path = path.clone();
  test_path.fullySelected = true;
  test_path.visible = true ;
  path.remove();
  
  for(var i =0; i<test_path.children.length; i++)
  {
    try
    {
      var centerline_path = test_path.children[i].exportSVG();
      
      var boundary = draw.path(path.children[i].pathData);
      boundary.fill('none')
      boundary.stroke({ color: 'black', width: 4, linecap: 'round', linejoin: 'round' })
      
      var polygon = centerling(centerline_path);
      var {polygon, edges} = drawVoronoi(polygon) 
      var new_edge = clipVoronoi({polygon, edges});
      var centerline = findCenterline(new_edge);
      simplifyCenterline(centerline)
        //path.classify();
    }
    catch(e)
    {
        //console.log("Error" + e);
    }
        
  }
}


function centerling(centerline_path)
{
  const svg = d3.select("svg").append("g");
  //console.log(centerline_path);


  const length = centerline_path.getTotalLength();

  const polygon = d3
    .range(PointsCount_value)
    .map(i => centerline_path.getPointAtLength(length * i / PointsCount_value))
    .map(d => [d.x, d.y]);

  const dots = svg
    .selectAll("circle")
    .data(polygon)
    .enter()
    .append("circle")
    .call(drawCircle);

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


  // svg
  //   .selectAll(".edge")
  //   .data(edges)
  //   .enter()
  //   .append("line")
  //   .attr("class", "edge")
  //   .call(drawLineSegment)

  return { polygon, edges };
}


function clipVoronoi({ polygon, edges }) {
  //const svg = d3.select("svg").append("g");
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

  // svg
  //   .selectAll(".clipped")
  //   .data(edges)
  //   .enter()
  //   .append("line")
  //   .attr("class", "clipped")
  //   .call(drawLineSegment);

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
    }, {})
    .path.map(id => nodes[+id]);

  svg
    .append("path")
    .attr("class", "longest")
    .attr("d", d3.line()(longestShortest));

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



PointsCount.oninput = function() { 
  PointsCount_value = this.value;
  const svg = d3.select("svg")
  svg.selectAll("*").remove();

  dosomething(path, PointsCount_value)
  //paperjs(url)
}



























































function simplify(simplify_slider, flatten_slider){
    if(update_item)
    {
      update_item.remove();
    }
    update_item = path.clone();
    update_item.visible = true;
        for(var i =0; i<update_item.children.length; i++)
        {
          try{
            update_item.children[i].fillColor = null;
            update_item.children[i].style = null;
            update_item.children[i].simplify(simplify_slider);
            update_item.children[i].flatten(flatten_slider);
            update_item.fullySelected = true
          }
          catch(error){
          }
        }
}





simplifyslider.oninput = function() { 
  simplify_slider = this.value;
  simplify(simplify_slider, flatten_slider)
  //paperjs(url)
}


flatterslider.oninput = function() { 
  flatten_slider = this.value;
  simplify(simplify_slider, flatten_slider)
  //paperjs(url)
}




function handleFiles(files) {

    var file = files[0];
    var imageType = /^image\//;

    var img = document.createElement("img");
    img.onload = function() {
        scalefactor = 1;
        img.height = img.height*scalefactor;
        img.width = img.width*scalefactor;
    };

    

    if (file.type.includes("svg")) 
    {
        $('#dropbox').addClass('hidden');
        // $('#preview').removeClass('hidden');
        // $('#preview').empty();
        // $('#preview').append(img);
        // $('#fileSelect').text('Replace Image');
        var reader = new FileReader();
        reader.onload = function(e) {
            img.src = e.target.result;
            url = img.src;
            paperjs(img.src);
        }
        reader.readAsDataURL(file);
    }

    else
    {
      var reader = new FileReader();
      reader.onload = function(e) {
          img.src = e.target.result;
          url = img.src;
          
          ImageTracer.imageToSVG(
            url,
            function(svgstr){ 
              paper.project.importSVG(svgstr, function(item) {
                path = item;
                path.visible = false ;
                simplify(simplify_slider, flatten_slider)
              })
            },
            'posterized2'
          ); 
      }   
      reader.readAsDataURL(file);
     
    }

  return;
}


function SaveSVG()
{
  fileName = "paperjs_example.svg"
  var url = "data:image/svg+xml;utf8," + encodeURIComponent(paper.project.exportSVG({asString:true}));

  var link = document.createElement("a");
  link.download = fileName;
  link.href = url;
  link.click();
}




// Event Handler

function eventImageSetup() {

    $(dropbox).height($('#imageBorder').height());
  
    fileSelect.addEventListener("click", function() {
      image.click();
    }, false);

    dropbox.addEventListener("dragenter", dragenter, false);
    dropbox.addEventListener("dragover", dragover, false);
    dropbox.addEventListener("drop", drop, false);
} // end of eventImageSetup


// Drag and Drop Events
function dragenter(e) {
    e.stopPropagation();
    e.preventDefault();
  }
  
  function dragover(e) {
    e.stopPropagation();
    e.preventDefault();
  }
  
  function drop(e) {
    e.stopPropagation();
    e.preventDefault();
    var dt = e.dataTransfer;
    var files = dt.files;
    handleFiles(files);
  }


eventImageSetup();