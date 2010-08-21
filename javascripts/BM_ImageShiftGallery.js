/*******************************************************************************

ImageShiftGallery, version 1.3.1 (08/21/2010)
(c) 2005 - 2010 Takashi Okamoto.

ImageShiftGallery is a JavaScript image viewer. It is freely distributable,
but this header must be included, and should not be modified. Donations are 
appreciated. For details, see the BuzaMoto website: http://buzamoto.com/

*******************************************************************************/

/* ----------------------------------------------------------------------------

1.3.1 - added transform3d support for supported browers, allows hardware
        acceleration for many browsers.
1.3   - added ongalleryload callback.
        added autoscroll
1.2.3 - enabled 'this' object for event handlers
1.2.2 - improved image dimension calculation
1.2.1 - added onmouseover and onmouseout behaviors
1.2   - added onclick behavior for images
        changed from templates to procedurally creating gallery elements
        fixed to support IE6
1.1.1 - fixed for IE7
        Safari image loading fix (able to apply width/height) to images
        added support to add padding on the right of the image
1.1   - enabled HTML content
1.0.2 - initial support for IE7
1.0.1 - fixed image loader for firefox

---------------------------------------------------------------------------- */

// ---------------------- com.buzamoto Namespace

var com;
if (!com)
  com = {};
else if (typeof com != "object")
  throw new Error("com already exists and is not an object");

if (!com.buzamoto)
  com.buzamoto = {};
else if (typeof com.buzamoto != "object")
  throw new Error("com.buzamoto already exists and is not an object");

if (com.buzamoto.ImageShiftGallery)
  throw new Error("com.buzamoto.ImageShiftGallery already exists");

// ---------------------- com.buzamoto.ImageShiftGallery

com.buzamoto.ImageShiftGallery = {
  Version: '1.3'
}


// ---------------------- com.buzamoto.ImageShiftGallery.Gallery

com.buzamoto.ImageShiftGallery.Gallery = Class.create({
  
  initialize: function(id, imageArray, align, autoscroll, autoscrollDelay) {
    this.wrapper = $(id);
    this.id = id;
    this.alignment = (align) ? align : 'top';
    this.autoscroll = (autoscroll == true);
    this.autoscrollTimer = null;
    this.autoscrollDelay = autoscrollDelay;
    
    // convert imageArray to array of ISGImages
    this.imageArray = new Array();
    for (var i = 0, len = imageArray.length; i < len; ++i) {
      var obj;
      if (imageArray[i].src)
        obj = new com.buzamoto.ImageShiftGallery.Image(this, imageArray[i]);
      else if (imageArray[i].markup)
        obj = new com.buzamoto.ImageShiftGallery.Markup(this, imageArray[i]);
      this.imageArray.push(obj);
    }
    var imageNodes = com.buzamoto.ImageShiftGallery.Gallery.createImageNodes(this.alignment, imageArray);
    
    // create dom elements to inject
    this.container = document.createElement('div');
    Element.extend(this.container);
    this.container.id = this.id + '-container';
    this.container.addClassName('isg_container');
    this.container.insert({top: imageNodes});
    this.totalWidth = this.container.childElements()[0].getWidth();
    
    // create controller
    this.controller = new com.buzamoto.ImageShiftGallery.Controller(this);
    
    // bind events to controls
    var control;
    var self = this;
    ['next', 'prev'].each(function(type) {
      if (control = $(self.id + "_" + type)) {
        Event.observe(control, 'click', function(e) {
          if (self.autoscroll) self.stopAutoScroll();
          self.controller.move(type);
          Event.stop(e);
        });
      }
    });
    
    // launch load notification to check for image load
    // onload doesn't seem to have complete image objects.
    window.setTimeout(function() {
      self.loadNotifier();
    }, 200);
  },
  
  onGalleryLoad: function() {
    this.wrapper.insert({top: this.container});
    this.setWidth();
    if (this.autoscroll) {
      this.scheduleAutoScroll();
    }
  },
  
  scheduleAutoScroll: function() {
    var self = this;
    this.autoscroll = true;
    this.autoscrollTimer = window.setTimeout(function() {
      self.controller.move('next');
      self.scheduleAutoScroll();
    }, this.autoscrollDelay);
  },
  
  stopAutoScroll: function() {
    if (this.autoscrollTimer) {
      window.clearTimeout(this.autoscrollTimer);
      this.autoscrollTimer = null;
      this.autoscroll = false;
    }
  },
  
  calcWidth: function() {
    var width = 0;
    for (var i = 0; i < this.imageArray.length; i++) {
      width += this.imageArray[i].getWidth();
    }
    return width;
  },
  
  setWidth: function() {
    this.totalWidth = this.calcWidth();
  },
  
  loadNotifier: function(delay) {
    delay = (delay) ? delay : 200;
    if (!this.loadedImages()) {
      var self = this;
      window.setTimeout(function() {
        self.loadNotifier(delay);
      }, delay);
    } else {
      this.onGalleryLoad();
    }
  },
  
  loadedImages: function() {
    for (var i = 0, len = this.imageArray.length; i < len; ++i) {
      if (this.imageArray[i].image) {
        if (this.imageArray[i].image.src && this.imageArray[i].image.complete == false) return false;
        if (this.imageArray[i].width == 0) this.imageArray[i].width = this.imageArray[i].image.width;
        if (this.imageArray[i].height == 0) this.imageArray[i].height = this.imageArray[i].image.height;
      }
    }
    return true;
  }
  
});
Object.extend(com.buzamoto.ImageShiftGallery.Gallery, {
  //MOVE_COORDS: new Array(0, -1, -4, -7, -11, -17, -23, -30, -38, -47, -56, -66, -75, -84, -92, -99, -100),
  MOVE_COORDS: new Array(0, -1, -4, -7, -11, -17, -23, -30, -38, -47, -56, -66, -75, -84, -92, -96, -100, -103, -105, -102, -101, -100),
  
  createImageNodes: function(align, imageArray) {
    // create table
    var imageTable = document.createElement('table');
    Element.extend(imageTable);
    imageTable.setAttribute('cellPadding', 0);
    imageTable.setAttribute('cellSpacing', 0);
    imageTable.setAttribute('border', 0);
    imageTable.addClassName('isg_table');
    
    // create tr
    var tr = document.createElement('tr');
    Element.extend(tr);
    
    imageArray.each(function(image) {
      var td = document.createElement('td');
      Element.extend(td);
      td.setStyle({verticalAlign: align});
      
      if (image.padding)
        td.setStyle({paddingRight: image.padding + 'px'});
      var node, handler;
      if (image.src) {
        node = document.createElement('img');
        Element.extend(node);
        node.setAttribute('src', image.src);
        if (image.width)
          node.setStyle({width: image.width + 'px'});
        if (image.height)
          node.setStyle({height: image.height + 'px'});
        if (image.click || image.mouseover || image.mouseout) {
          handler = document.createElement('a');
          Element.extend(handler);
          handler.setAttribute('href', 'javascript:void(0)');
          handler.setStyle({display: 'block', lineHeight: 0});
          
          ['click', 'mouseover', 'mouseout'].each(function(evt) {
            if (image[evt]) {
              //using bindAsEventListener allows us to pass image as 'this'
              handler.observe(evt, image[evt].bindAsEventListener(image));
            }
          });
          
          handler.insert({bottom: node});
          node = handler;
        }
      } else if (image.markup) {
        node = document.createElement('div');
        Element.extend(node);
        node.addClassName('isg_markup-wrapper');
        node.setStyle({width: image.width + 'px', height: image.height + 'px'});
        node.update(image.markup);
      }
      td.insert({bottom: node});
      tr.insert({bottom: td});
    });
    if (navigator.userAgent.match(/MSIE/)) {
      var tbody = document.createElement('tbody');
      tbody.appendChild(tr);
      tr = tbody;
    }
    imageTable.insert({bottom: tr});
    return imageTable;
  }
});


// ---------------------- ImageShiftImage

com.buzamoto.ImageShiftGallery.Image = Class.create({
  
  initialize: function(gallery, imageObject) {
    this.gallery = gallery;
    this.properties = com.buzamoto.ImageShiftGallery.Image.DEFAULT.merge($H(imageObject));
    this.width = this.properties.get('width');
    this.height = this.properties.get('height');
    this.image = new Image();
    this.image.src = this.properties.get('src');
  },
  
  getWidth: function() {
    return this.width + this.properties.get('padding');
  },
  
  getHeight: function() {
    return this.height;
  },
  
  getTitle: function() {
    return this.properties.get('title');
  },
  
  getCaption: function() {
    return this.properties.get('caption');
  }
  
});
Object.extend(com.buzamoto.ImageShiftGallery.Image, {
  DEFAULT: $H({
    src:     '',
    caption: '...',
    title:   '...',
    width:   0, 
    height:  0,
    padding: 0
  })
});


// ---------------------- ImageShiftMarkup

com.buzamoto.ImageShiftGallery.Markup = Class.create({
  
  initialize: function(gallery, obj) {
    this.gallery = gallery;
    this.properties = com.buzamoto.ImageShiftGallery.Markup.DEFAULT.merge($H(obj));
    this.markup = obj.markup
  },
  
  getWidth: function() {
    return this.properties.get('width') + this.properties.get('padding');
  },
  
  getHeight: function() {
    return this.properties.get('height');;
  },
  
  getTitle: function() {
    return this.properties.get('title');
  },
  
  getCaption: function() {
    return this.properties.get('caption');
  }
  
});
Object.extend(com.buzamoto.ImageShiftGallery.Markup, {
  DEFAULT: $H({
    markup:     '<div style="width: 500px; height: 500px; background-color: red;"></div>',
    caption: '...',
    title:   '...',
    width:   500, 
    height:  500,
    padding: 0
  })
});


// ---------------------- ImageShiftController

com.buzamoto.ImageShiftGallery.Controller = Class.create({
  
  /* ------------- CALLBACKS ------------- */
  /* ------------- EDITABLE -------------- */
  
  onShiftStart: function() {
    this.setTitle("...");
    this.setCaption("&nbsp;");
  },

  onShiftEnd: function() {
    var title = (this.imgsArray[this.unit].getTitle()) ? this.imgsArray[this.unit].getTitle() : "";
    var caption = (this.imgsArray[this.unit].getCaption()) ? this.imgsArray[this.unit].getCaption() : "";
    this.setTitle(title);
    this.setCaption(caption);
  },
  
  /* ------------- DON'T EDIT PAST HERE ------------- */
  
  initialize: function(gallery) {
    this.gallery = gallery;
    this.posX = 0;
    this.dir = "next";
    this.moving = false;
    this.frame = 0;
    this.frameTotal = com.buzamoto.ImageShiftGallery.Gallery.MOVE_COORDS.length;
    this.MOVE_COORDS = new Array(this.frameTotal);
    this.timerID = null;
    this.imgsArray = this.gallery.imageArray;
    this.unit = 0;
    this.unitTotal = this.imgsArray.length;
    
    this.support3d = false;
    ['perspectiveProperty',
     'WebkitPerspective',
     'MozPerspective',
     'OPerspective',
     'msPerspective'].each(function(prop) {
       if (typeof this.gallery.container.getStyle(prop) != 'undefined') {
         this.support3d = true;
         $break;
       }
     }, this);
    
    // initially set title/captions.
    var title = (this.imgsArray[this.unit].getTitle()) ? this.imgsArray[this.unit].getTitle() : "";
    var caption = (this.imgsArray[this.unit].getCaption()) ? this.imgsArray[this.unit].getCaption() : "";
    this.setTitle(title);
    this.setCaption(caption);
  },
  
  setCaption: function(caption) {
    if ($(this.gallery.wrapper.id+"_caption")) $(this.gallery.wrapper.id+"_caption").update(caption);
  },
  
  setTitle: function(title) {
    if ($(this.gallery.wrapper.id+"_title")) $(this.gallery.wrapper.id+"_title").update(title);
  },

  calcX: function(dir, currX) {
    var scale = this.imgsArray[this.unit].getWidth() / 100;
    switch (dir) {
      case "next":
        for (var i = 0; i < this.frameTotal; i++) {
          this.MOVE_COORDS[i] = currX + com.buzamoto.ImageShiftGallery.Gallery.MOVE_COORDS[i] * scale;
        }
        break;
      
      case "prev":
        var scale = this.imgsArray[this.unit-1].getWidth() / 100;
        for (var i = 0; i < this.frameTotal; i++) {
          this.MOVE_COORDS[i] = currX - com.buzamoto.ImageShiftGallery.Gallery.MOVE_COORDS[i] * scale;
        }
        break;

      case "start":
        for (var i = 0; i < this.frameTotal; i++) {
          this.MOVE_COORDS[i] = currX - com.buzamoto.ImageShiftGallery.Gallery.MOVE_COORDS[i] / 100 * (this.gallery.totalWidth - this.imgsArray[this.imgsArray.length-1].getWidth());
        }
        break;
      
      case "end":
        for (var i = 0; i < this.frameTotal; i++) {
          this.MOVE_COORDS[i] = currX + com.buzamoto.ImageShiftGallery.Gallery.MOVE_COORDS[i] / 100 * (this.gallery.totalWidth-this.imgsArray[this.imgsArray.length-1].getWidth());
        }
    }
  },

  moveTo: function(x) {
    if (this.support3d) {
      var transform = 'translate3d(' + x + 'px, ' + '0, 0)';
      $(this.gallery.container.id).setStyle({
        webkitTransform: transform
      });
    } else {
      $(this.gallery.container.id).style.left = x + "px";
    }
  },

  move: function(dir) {
    this.setDir(dir);
    this.run();
  },

  setDir: function(dir) {
    this.dir = dir;
  },

  run: function() {
    if (this.timerID) {
      window.clearTimeout(this.timerID);
      this.timerID = null;
    }
    if (!this.moving) {
      // run on start callback
      this.onShiftStart();
      if (this.dir == "next") {
        if (this.unit < this.unitTotal-1) {
          this.calcX("next", this.posX);
          this.unit++;
        }
        else if (this.unit == this.unitTotal-1) {
          this.calcX("start", this.posX);
          this.unit = 0;
        }
        else return;
      }
      else if (this.dir == "prev") {
        if (this.unit > 0) {
          this.calcX("prev", this.posX);
          this.unit--;
        }
        else if (this.unit == 0) {
          this.calcX("end", this.posX);
          this.unit = this.unitTotal-1;
        }
        else return;
      }
      else return;
      this.moving = true;
    }
    if (this.frame < this.frameTotal) {
      this.posX = this.MOVE_COORDS[this.frame];
      this.frame++;
      this.moveTo(this.posX);
      var self = this;
      this.timerID = window.setTimeout(function() {
        self.run();
      }, 20);
    }
    else {
      this.moving = false;
      this.frame = 0;
      window.clearTimeout(this.timerID);
      this.timerID = null;
      // run on end callback
      this.onShiftEnd();
    }
  }
});