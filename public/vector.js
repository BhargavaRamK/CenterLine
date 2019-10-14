
var draw = SVG(document.querySelector('#drawing')).size(1000, 1000)
//Initialize Sliders 
var simplifyslider = document.getElementById("simplify_slider"); 
var simplify_slider = simplifyslider.value;
var flatterslider = document.getElementById("flatten_slider"); 
var flatten_slider = flatterslider.value;
var PointsCount = document.getElementById("PointsCount"); 
var PointsCount_value = PointsCount.value;


//Initialize Paper Js
var canvas = document.getElementById('Canvas')
var scope = paper.setup(canvas)
var path = new paper.Path();

var url = "";
var item;
var update_item;

paperjs(url);


function paperjs(url)
{
    paper.project.importSVG(url, function(item) {
        path = item;
        path.scale(0.5)
        path.position = new paper.Point(path.bounds.width/2, path.bounds.height/2)
        path.visible = false ;
        PointsCount_value = 20;

        //Center Line Function
        var centerline = CenterLine(path, PointsCount_value)
        console.log(centerline[0]); //Print CenterLine Generated!
    });
}












//----------------------- Sliders -----------------------

PointsCount.oninput = function() { 
  PointsCount_value = this.value;
  CenterLine(path, PointsCount_value) 
}


simplifyslider.oninput = function() { 
  simplify_slider = this.value;
  //simplify(simplify_slider, flatten_slider)
}


flatterslider.oninput = function() { 
  flatten_slider = this.value;
  //simplify(simplify_slider, flatten_slider)
}








//----------------------- To Simplify/Flatten path -----------------------
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


// Function for Adding SVG File to the project 
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



//----------------------- To Save SVG File -----------------------

function SaveSVG()
{
  fileName = "paperjs_example.svg"
  var url = "data:image/svg+xml;utf8," + encodeURIComponent(paper.project.exportSVG({asString:true}));

  var link = document.createElement("a");
  link.download = fileName;
  link.href = url;
  link.click();
}




//----------------------- Event Handlers -----------------------

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



