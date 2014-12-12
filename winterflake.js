var WinterFlake = {
  opts: null,
  
  canvas: null,
  gl: null,
  
  particles: null,
  buffer: null,
  
  mouseX: null,
  
  run: function(opts) {
    var canvas, gl, buffer;
    
    this.opts = {
      src: 'flake.png',
      minCount: 750,
      maxCount: 1500,
      minSize: 10,
      maxSize: 20,
      speed: 0.002
    };
    
    if (opts) {
      for (key in opts) {
        this.opts[key] = opts[key];
      }
    }
    
    canvas = document.createElement('canvas');
    canvas.id = 'wf-canvas';
    canvas.style.pointerEvents = 'none';
    canvas.style.position = 'fixed';
    canvas.style.left = canvas.style.top = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.width = document.documentElement.clientWidth;
    canvas.height = document.documentElement.clientHeight;
    
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    this.canvas = canvas;
    this.gl = gl;
    
    gl.viewport(0.0, 0.0, canvas.width, canvas.height);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    buffer = gl.createBuffer();
    
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    
    if (!this.setShaders()) {
      this.destroy();
      return false;
    }
    
    this.buildParticles();
    
    this.setTexture();
    
    document.body.appendChild(canvas);
    
    this.mouseX = 0.0;
    
    window.addEventListener('resize', this.onWindowResize, false);
    document.addEventListener('mousemove', this.onMouseMove, false);
  },
  
  buildParticles: function() {
    var count, i, ii, buffer, particles;
    
    count = (0 | Math.random() * (this.opts.maxCount - this.opts.minCount))
      + this.opts.minCount;
    
    buffer = new Float32Array(count * 3);
    particles = new Array(count);
    
    for (i = 0; i < count; ++i) {
      ii = i * 3;
      
      particles[i] = {
        x: buffer[ii] = this.getRandomPos(),
        y: buffer[ii + 1] = this.getRandomPos(),
        size: buffer[ii + 2] = this.getRandomSize(),
        dir: this.getRandomDir(),
      }
    }
    
    this.particles = particles;
    this.buffer = buffer;
  },
  
  normalize: function(vec) {
    var x, y, length;
    
    x = vec[0];
    y = vec[1];
    length = x * x + y * y;
    
    if (length > 0) {
      len = 1 / Math.sqrt(length);
      vec[0] = vec[0] * length;
      vec[1] = vec[1] * length;
    }
  },
  
  onWindowResize: function() {
    var self = WinterFlake;
    
    self.canvas.width = document.documentElement.clientWidth;
    self.canvas.height = document.documentElement.clientHeight;
    self.gl.viewport(0.0, 0.0, self.canvas.width, self.canvas.height);
  },
  
  onMouseMove: function(e) {
    WinterFlake.mouseX = e.clientX;
  },
  
  getRandomPos: function() {
    return Math.random() * 2.2 - 1.1;
  },
  
  getRandomSize: function() {
    return Math.random() * (this.opts.maxSize - this.opts.minSize) + this.opts.minSize;
  },
  
  getRandomDir: function() {
    return [
      Math.random() * 0.0006 - 0.0003,
      -(Math.random() * this.opts.speed + this.opts.speed * 0.75)
    ]
  },
  
  destroy: function() {
    window.removeEventListener('resize', this.onWindowResize, false);
    document.removeEventListener('mousemove', this.onMouseMove, false);
    
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    
    this.canvas = this.gl = this.particles = this.buffer = this.opts
      = this.mouseX = null;
  },
  
  updateBuffer: function() {
    var i, ii, p, count, dx;
    
    count = this.particles.length;
    
    for (i = 0; i < count; ++i) {
      ii = i * 3;
      
      p = this.particles[i];
      
      if (p.y < -1.1 || p.x < -1.1 || p.x > 1.1) {
        p.x = this.buffer[ii] = this.getRandomPos();
        p.y = this.buffer[ii + 1] = 1.1;
        p.size = this.buffer[ii + 2] = this.getRandomSize();
        p.dir = this.getRandomDir();
      }
      else {
        dx = (this.mouseX / document.documentElement.clientWidth * 2 - 1) / 2500;
        
        this.buffer[ii] = p.x = p.x + p.dir[0] + dx;
        this.buffer[ii + 1] = p.y = p.y + p.dir[1];
      }
    }
  },
  
  draw: function() {
    var gl;
    
    gl = this.gl;
    
    gl.bufferData(gl.ARRAY_BUFFER, WinterFlake.buffer, gl.DYNAMIC_DRAW);
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    gl.drawArrays(gl.POINTS, 0, WinterFlake.particles.length);
  },
  
  setTexture: function() {
    var img;
    
    img = new Image();
    img.onload = this.onTextureLoaded;
    img.src = this.opts.src;
  },
  
  onTextureLoaded: function() {
    var tex, gl;
    
    gl = WinterFlake.gl;
    
    tex = gl.createTexture();
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);
    
    WinterFlake.onAnimationFrame();
  },
  
  onAnimationFrame: function() {
    if (!WinterFlake.canvas) {
      return;
    }
    
    requestAnimationFrame(WinterFlake.onAnimationFrame);
    
    WinterFlake.updateBuffer();
    WinterFlake.draw();
  },
  
  setShaders: function() {
    var gl, src, shader, prog, attr;
    
    gl = WinterFlake.gl;
    
    prog = gl.createProgram();
    
    // Vertex
    src = '\
      attribute vec2 pos;\
      attribute float size;\
      void main() {\
        gl_PointSize = size;\
        gl_Position = vec4(pos, -1.0, 1.0);\
      }';
    shader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.log("Couldn't compile vertex shader");
      return false;
    }
    
    gl.attachShader(prog, shader);
    
    // Fragment
    src = '\
      uniform sampler2D sampler;\
      void main() {\
        gl_FragColor = texture2D(sampler, gl_PointCoord);\
      }';
    shader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.log("Couldn't compile fragment shader");
      return false;
    }
    
    gl.attachShader(prog, shader);
    
    gl.linkProgram(prog);
    
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.log("Couldn't link program");
      return false;
    }
    
    gl.useProgram(prog);
    
    this.shader = prog;
    
    attr = gl.getAttribLocation(prog, 'pos');
    gl.enableVertexAttribArray(attr);
    gl.vertexAttribPointer(attr, 2, gl.FLOAT, false, 12, 0);
    
    attr = gl.getAttribLocation(prog, 'size');
    gl.enableVertexAttribArray(attr);
    gl.vertexAttribPointer(attr, 1, gl.FLOAT, false, 12, 8);
    
    attr = gl.getUniformLocation(prog, 'sampler');
    gl.uniform1i(attr, 0);
    
    return true;
  },
};
