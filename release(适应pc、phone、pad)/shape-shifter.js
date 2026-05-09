/*
 * Shape Shifter
 * http://www.kennethcachia.com/shape-shifter
 * A canvas experiment
 */

'use strict';

var S = {
  init: function () {
    var action = window.location.href,
        i = action.indexOf('?a=');

    S.Drawing.init('.canvas');
    S.ShapeBuilder.init();
    S.UI.init();
    
    // 初始化音频播放器
    S.initAudioPlayer();
    
    document.body.classList.add('body--ready');

    if (i !== -1) {
      S.UI.simulate(decodeURI(action).substring(i + 3));
    } else {
      S.UI.simulate('|#countdown 3||祝妈妈|母亲节快乐|祝您永远年轻|身体健康|万事如意|您辛苦了|妈妈我爱您|#icon heart|#icon heart-empty|#icon heart');
    }

    S.Drawing.loop(function () {
      S.Shape.render();
    });
  },
  
  initAudioPlayer: function () {
    var audio = document.getElementById('bgm');
    var volumeBtn = document.getElementById('volumeBtn');
    var isPlaying = false;
    
    function updateVolumeButton() {
      volumeBtn.classList.toggle('is-playing', isPlaying);
      volumeBtn.setAttribute('aria-label', isPlaying ? 'Pause music' : 'Play music');
    }
    
    // 初始化按钮显示为暂停状态
    updateVolumeButton();
    
    // 检查音频文件是否加载成功
    audio.addEventListener('error', function(e) {
      console.error('音频加载失败:', e);
      console.error('错误代码:', audio.error ? audio.error.code : 'unknown');
      alert('找不到 lavender.mp3 音乐文件！\n请确保音乐文件在项目文件夹根目录下。');
    });
    
    audio.addEventListener('loadeddata', function() {
      console.log('音频文件加载成功');
    });
    
    // 播放成功回调
    audio.addEventListener('play', function() {
      isPlaying = true;
      updateVolumeButton();
      console.log('音频开始播放');
    });
    
    // 暂停回调
    audio.addEventListener('pause', function() {
      isPlaying = false;
      updateVolumeButton();
      console.log('音频已暂停');
    });
    
    // 音量按钮点击事件
    volumeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      
      console.log('按钮点击，当前状态:', isPlaying ? '播放中' : '暂停');
      
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play().then(function () {
          console.log('播放成功');
        }).catch(function (err) {
          console.error('播放失败:', err);
          var errorMsg = '播放失败！';
          if (err.name === 'NotAllowedError') {
            errorMsg += '请先点击页面任意位置，然后再点击音频按钮。';
          } else if (audio.error && audio.error.code === 4) {
            errorMsg += ' 找不到 lavender.mp3 文件！';
          }
          alert(errorMsg);
        });
      }
    });
    
    // 设置初始音量
    audio.volume = 0.7;
    
    console.log('音频播放器初始化完成');
    console.log('请确保项目文件夹中有 lavender.mp3 文件');
  }
};


window.addEventListener('load', function () {
  S.init();
});



S.Drawing = (function () {
  var canvas,
      context,
      renderFn,
      requestFrame = window.requestAnimationFrame       ||
                     window.webkitRequestAnimationFrame ||
                     window.mozRequestAnimationFrame    ||
                     window.oRequestAnimationFrame      ||
                     window.msRequestAnimationFrame     ||
                     function (callback) {
                        window.setTimeout(callback, 1000 / 60);
                      };

  return {
    init: function (el) {
      canvas = document.querySelector(el);
      context = canvas.getContext('2d');
      this.adjustCanvas();

      window.addEventListener('resize', function () {
        S.Drawing.adjustCanvas();
      });
    },

    loop: function (fn) {
      renderFn = !renderFn ? fn : renderFn;
      this.clearFrame();
      renderFn();
      requestFrame.call(window, this.loop.bind(this));
    },

    adjustCanvas: function () {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    },

    clearFrame: function () {
      context.clearRect(0, 0, canvas.width, canvas.height);
    },

    getArea: function () {
      return { w: canvas.width, h: canvas.height };
    },

    drawCircle: function (p, c) {
      context.fillStyle = c.render();
      context.beginPath();
      context.arc(p.x, p.y, p.z, 0, 2 * Math.PI, true);
      context.closePath();
      context.fill();
    }
  };
}());



S.Point = function (args) {
  this.x = args.x;
  this.y = args.y;
  this.z = args.z;
  this.a = args.a;
  this.h = args.h;
};



S.Color = function (r, g, b, a) {
  this.r = r;
  this.g = g;
  this.b = b;
  this.a = a;
};

S.Color.prototype = {
  render: function () {
    return 'rgba(' + this.r + ',' + this.g + ',' + this.b + ',' + this.a + ')';
  }
};



S.UI = (function () {
  // 在S.UI模块的变量定义部分添加delay1和delay2
  var input = document.querySelector('.ui-input'),
      ui = document.querySelector('.ui'),
      help = document.querySelector('.help'),
      commands = document.querySelector('.commands'),
      overlay = document.querySelector('.overlay'),
      canvas = document.querySelector('.canvas'),
      interval,
      isTouch = 'ontouchstart' in window || navigator.msMaxTouchPoints,
      currentAction,
      resizeTimer,
      time,
      maxShapeSize = 30,
      firstAction = true,
      sequence = [],
      cmd = '#',
      delay1 = 1200, // 手机端读秒节奏
      delay2 = 1800; // 手机端语句/图标切换节奏

  function handleVisibilityChange() {
    if (!document.hidden && S.Shape && S.Shape.settleVisible) {
      S.Drawing.adjustCanvas();
      S.Shape.settleVisible();
    }
  }
  
  function performAction(value) {
      var action, current;

      overlay.classList.remove('overlay--visible');
      sequence =
          typeof value === 'object' ? value : sequence.concat(value.split('|'));
      input.value = '';
      checkInputWidth();

      timedAction(
          function () {
              current = sequence.shift();
              action = getAction(current);
              value = getValue(current);

              switch (action) {
                  case 'countdown':
                      value = parseInt(value, 10) || 10;
                      value = value > 0 ? value : 10;

                      timedAction(
                          function (index) {
                              if (index === 0) {
                                  if (sequence.length === 0) {
                                      S.Shape.switchShape(S.ShapeBuilder.letter(''));
                                  } else {
                                      performAction(sequence);
                                  }
                              } else {
                                  S.Shape.switchShape(S.ShapeBuilder.letter(index), true);
                              }
                          },
                          delay1, // 使用delay1代替硬编码的1000
                          value,
                          true
                      );
                      break;

                  case 'rectangle':
                      value = value && value.split('x');
                      value =
                          value && value.length === 2
                              ? value
                              : [maxShapeSize, maxShapeSize / 2];

                      S.Shape.switchShape(
                          S.ShapeBuilder.rectangle(
                              Math.min(maxShapeSize, parseInt(value[0], 10)),
                              Math.min(maxShapeSize, parseInt(value[1], 10))
                          )
                      );
                      break;

                  case 'circle':
                      value = parseInt(value, 10) || maxShapeSize;
                      value = Math.min(value, maxShapeSize);
                      S.Shape.switchShape(S.ShapeBuilder.circle(value));
                      break;

                  case 'time':
                      var t = formatTime(new Date());

                      if (sequence.length > 0) {
                          S.Shape.switchShape(S.ShapeBuilder.letter(t));
                      } else {
                          timedAction(function () {
                              t = formatTime(new Date());
                              if (t !== time) {
                                  time = t;
                                  S.Shape.switchShape(S.ShapeBuilder.letter(time));
                              }
                          }, 1000);
                      }
                      break;

                  case 'icon':
                      S.ShapeBuilder.imageFile(
                          'font-awesome/' + value + '.png',
                          function (obj) {
                              S.Shape.switchShape(obj);
                          }
                      );
                      break;

                  default:
                      S.Shape.switchShape(
                          S.ShapeBuilder.letter(current[0] === cmd ? 'What?' : current)
                      );
              }
          },
          delay2, // 使用delay2代替硬编码的2000
          sequence.length
      );
  }

  function formatTime(date) {
    var h = date.getHours(),
        m = date.getMinutes();

    m = m < 10 ? '0' + m : m;
    return h + ':' + m;
  }

  function getValue(value) {
    return value && value.split(' ')[1];
  }

  function getAction(value) {
    value = value && value.split(' ')[0];
    return value && value[0] === cmd && value.substring(1);
  }

  function timedAction(fn, delay, max, reverse) {
    clearInterval(interval);
    currentAction = reverse ? max : 1;
    fn(currentAction);
    
    if (
      !max ||
      (!reverse && currentAction < max) ||
      (reverse && currentAction > 0)
    ) {
      interval = setInterval(function () {
        if (document.hidden) {
          return;
        }

        currentAction = reverse ? currentAction - 1 : currentAction + 1;
        fn(currentAction);

        if (
          (!reverse && max && currentAction === max) ||
          (reverse && currentAction === 0)
        ) {
          clearInterval(interval);
        }
      }, delay);
    }
  }

  function reset(destroy) {
    clearInterval(interval);
    sequence = [];
    time = null;

    if (destroy) {
      S.Shape.switchShape(S.ShapeBuilder.letter(''));
    }
  }

  function checkInputWidth() {
    if (input.value.length > 18) {
      ui.classList.add('ui--wide');
    } else {
      ui.classList.remove('ui--wide');
    }

    if (firstAction && input.value.length > 0) {
      ui.classList.add('ui--enter');
    } else {
      ui.classList.remove('ui--enter');
    }
  }

  function bindEvents() {
    document.body.addEventListener('keydown', function (e) {
      input.focus();

      if (e.keyCode === 13) {
        firstAction = false;
        reset();
        performAction(input.value);
      }
    });

    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        S.Shape.settleVisible();
        reset(true);
      }, 500);
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    input.addEventListener('input', checkInputWidth);
    input.addEventListener('change', checkInputWidth);
    input.addEventListener('focus', checkInputWidth);

    help.addEventListener('click', function () {
      overlay.classList.toggle('overlay--visible');

      if (overlay.classList.contains('overlay--visible')) {
        reset(true);
      }
    });

    commands.addEventListener('click', function (e) {
      var el, info, demo, url;

      if (e.target.classList.contains('commands-item')) {
        el = e.target;
      } else {
        el = e.target.parentNode.classList.contains('commands-item')
          ? e.target.parentNode
          : e.target.parentNode.parentNode;
      }

      info = el && el.querySelector('.commands-item-info');
      demo = el && info.getAttribute('data-demo');
      url = el && info.getAttribute('data-url');

      if (info) {
        overlay.classList.remove('overlay--visible');

        if (demo) {
          input.value = demo;

          if (isTouch) {
            reset();
            performAction(input.value);
          } else {
            input.focus();
          }
        } else if (url) {
          window.location = url;
        }
      }
    });

    canvas.addEventListener('click', function () {
      overlay.classList.remove('overlay--visible');
    });
  }

  return {
    init: function () {
      bindEvents();
      input.focus();

      if (isTouch) {
        document.body.classList.add('touch');
      }

      S.UI.Tabs.init();
    },

    simulate: function (action) {
      performAction(action);
    }
  };
}());



S.UI.Tabs = (function () {
  var labels = document.querySelector('.tabs-labels'),
      triggers = document.querySelectorAll('.tabs-label'),
      panels = document.querySelectorAll('.tabs-panel');

  function activate(i) {
    triggers[i].classList.add('tabs-label--active');
    panels[i].classList.add('tabs-panel--active');
  }

  function bindEvents() {
    labels.addEventListener('click', function (e) {
      var el = e.target,
          index;

      if (el.classList.contains('tabs-label')) {
        for (var t = 0; t < triggers.length; t++) {
          triggers[t].classList.remove('tabs-label--active');
          panels[t].classList.remove('tabs-panel--active');

          if (el === triggers[t]) {
            index = t;
          }
        }

        activate(index);
      }
    });
  }

  return {
    init: function () {
      activate(0);
      bindEvents();
    }
  };
}());



S.Dot = function (x, y) {
  this.p = new S.Point({
    x: x,
    y: y,
    z: 5,
    a: 1,
    h: 0
  });

  this.e = 0.07;
  this.maxStep = 12;
  this.s = true;

  this.c = new S.Color(255, 192, 203, this.p.a);

  this.t = this.clone();
  this.q = [];
};

S.Dot.prototype = {
  clone: function () {
    return new S.Point({
      x: this.x,
      y: this.y,
      z: this.z,
      a: this.a,
      h: this.h
    });
  },

  _draw: function () {
    this.c.a = this.p.a;
    S.Drawing.drawCircle(this.p, this.c);
  },

  _moveTowards: function (n) {
    var details = this.distanceTo(n, true),
        dx = details[0],
        dy = details[1],
        d = details[2],
        e = Math.min(this.e * d, this.maxStep);

    if (this.p.h === -1) {
      this.p.x = n.x;
      this.p.y = n.y;
      return true;
    }

    if (d > 1) {
      this.p.x -= (dx / d) * e;
      this.p.y -= (dy / d) * e;
    } else {
      if (this.p.h > 0) {
        this.p.h--;
      } else {
        return true;
      }
    }

    return false;
  },

  _update: function () {
    var p, d;

    if (this._moveTowards(this.t)) {
      p = this.q.shift();

      if (p) {
        this.t.x = p.x || this.p.x;
        this.t.y = p.y || this.p.y;
        this.t.z = p.z || this.p.z;
        this.t.a = p.a || this.p.a;
        this.p.h = p.h || 0;
      } else {
        if (this.s) {
          this.p.x -= Math.sin(Math.random() * 3.142);
          this.p.y -= Math.sin(Math.random() * 3.142);
        } else {
          this.move(
            new S.Point({
              x: this.p.x + Math.random() * 50 - 25,
              y: this.p.y + Math.random() * 50 - 25,
            })
          );
        }
      }
    }

    d = this.p.a - this.t.a;
    this.p.a = Math.max(0.1, this.p.a - d * 0.05);
    d = this.p.z - this.t.z;
    this.p.z = Math.max(1, this.p.z - d * 0.05);
  },

  distanceTo: function (n, details) {
    var dx = this.p.x - n.x,
        dy = this.p.y - n.y,
        d = Math.sqrt(dx * dx + dy * dy);

    return details ? [dx, dy, d] : d;
  },

  move: function (p, avoidStatic) {
    if (S.Shape && S.Shape.clampPoint) {
      p = S.Shape.clampPoint(p);
    }

    if (!avoidStatic || (avoidStatic && this.distanceTo(p) > 1)) {
      this.q.push(p);
    }
  },

  clearQueue: function () {
    this.q = [];
  },

  settle: function () {
    this.clearQueue();

    if (this.t && isFinite(this.t.x) && isFinite(this.t.y)) {
      this.p.x = this.t.x;
      this.p.y = this.t.y;
    }
  },

  snapTo: function (p) {
    this.clearQueue();
    this.t.x = p.x;
    this.t.y = p.y;
    this.t.z = typeof p.z === 'number' ? p.z : 5;
    this.t.a = typeof p.a === 'number' ? p.a : 1;
    this.p.x = this.t.x;
    this.p.y = this.t.y;
    this.p.z = this.t.z;
    this.p.a = this.t.a;
    this.p.h = 0;
  },

  render: function () {
    this._update();
    this._draw();
  }
};



S.ShapeBuilder = (function () {
  var gap = 5, // 手机端专用粒子取样间距
      shapeCanvas = document.createElement('canvas'),
      shapeContext = shapeCanvas.getContext('2d'),
      fontSize = 500,
      fontFamily = 'Avenir, Helvetica Neue, Helvetica, Arial, sans-serif';

  function fit() {
    gap = 5;
    shapeCanvas.width = Math.floor(window.innerWidth / gap) * gap;
    shapeCanvas.height = Math.floor(window.innerHeight / gap) * gap;
    shapeContext.fillStyle = 'red';
    shapeContext.textBaseline = 'middle';
    shapeContext.textAlign = 'center';
  }

  function getDotRadius() {
    return 2.2;
  }

  function getMobileIconSize() {
    return Math.floor(Math.min(shapeCanvas.width * 0.58, shapeCanvas.height * 0.28) / gap) * gap;
  }

  function processCanvas() {
    var pixels = shapeContext.getImageData(
        0,
        0,
        shapeCanvas.width,
        shapeCanvas.height
      ).data,
        dots = [],
        x = 0,
        y = 0,
        fx = shapeCanvas.width,
        fy = shapeCanvas.height,
        w = 0,
        h = 0;

    for (var p = 0; p < pixels.length; p += 4 * gap) {
      if (pixels[p + 3] > 0) {
        dots.push(
          new S.Point({
            x: x,
            y: y
          })
        );

        w = x > w ? x : w;
        h = y > h ? y : h;
        fx = x < fx ? x : fx;
        fy = y < fy ? y : fy;
      }

      x += gap;

      if (x >= shapeCanvas.width) {
        x = 0;
        y += gap;
        p += gap * 4 * shapeCanvas.width;
      }
    }

    return { dots: dots, w: w + fx, h: h + fy, r: getDotRadius() };
  }

  function setFontSize(s) {
    shapeContext.font = 'bold ' + s + 'px ' + fontFamily;
  }

  function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }

  return {
    init: function () {
      fit();
      window.addEventListener('resize', fit);
    },

    imageFile: function (url, callback) {
      var image = new Image();

      image.onload = function () {
        var iconSize = getMobileIconSize();

        shapeContext.clearRect(0, 0, shapeCanvas.width, shapeCanvas.height);
        shapeContext.drawImage(this, 0, 0, iconSize, iconSize);
        callback(processCanvas());
      };

      image.onerror = function () {
        callback(S.ShapeBuilder.letter('What?'));
      };

      image.src = url;
    },

    circle: function (d) {
      var r = Math.max(0, d) / 2;
      shapeContext.clearRect(0, 0, shapeCanvas.width, shapeCanvas.height);
      shapeContext.beginPath();
      shapeContext.arc(r * gap, r * gap, r * gap, 0, 2 * Math.PI, false);
      shapeContext.fill();
      shapeContext.closePath();

      return processCanvas();
    },

    letter: function (l) {
      var s = 0;

      setFontSize(fontSize);
      s = Math.min(
        fontSize,
        (shapeCanvas.width / shapeContext.measureText(l).width) * 0.76 * fontSize,
        (shapeCanvas.height / fontSize) * (isNumber(l) ? 0.46 : 0.18) * fontSize
      );
      setFontSize(s);

      shapeContext.clearRect(0, 0, shapeCanvas.width, shapeCanvas.height);
      shapeContext.fillText(l, shapeCanvas.width / 2, shapeCanvas.height / 2);

      return processCanvas();
    },

    rectangle: function (w, h) {
      var dots = [],
          width = gap * w,
          height = gap * h;

      for (var y = 0; y < height; y += gap) {
        for (var x = 0; x < width; x += gap) {
          dots.push(
            new S.Point({
              x: x,
              y: y,
            })
          );
        }
      }

      return { dots: dots, w: width, h: height, r: getDotRadius() };
    }
  };
}());



S.Shape = (function () {
  var dots = [],
      width = 0,
      height = 0,
      cx = 0,
      cy = 0,
      stableTargets = [];

  function compensate() {
    var a = S.Drawing.getArea();

    cx = a.w / 2 - width / 2;
    cy = a.h / 2 - height / 2;
  }

  function clampPoint(p, padding) {
    var a = S.Drawing.getArea(),
        pad = padding || 30;

    if (typeof p.x === 'number') {
      p.x = Math.max(-pad, Math.min(a.w + pad, p.x));
    }

    if (typeof p.y === 'number') {
      p.y = Math.max(-pad, Math.min(a.h + pad, p.y));
    }

    return p;
  }

  return {
    shuffleIdle: function () {
      for (var d = 0; d < dots.length; d++) {
        if (!dots[d].s) {
          dots[d].move(clampPoint(new S.Point({
            x: dots[d].p.x + Math.random() * 120 - 60,
            y: dots[d].p.y + Math.random() * 120 - 60,
          })));
        }
      }
    },

    clampPoint: clampPoint,

    settleVisible: function () {
      for (var d = 0; d < dots.length; d++) {
        if (stableTargets[d]) {
          dots[d].snapTo(stableTargets[d]);
        } else {
          dots[d].settle();
          dots[d].p = clampPoint(dots[d].p);
          dots[d].t.x = dots[d].p.x;
          dots[d].t.y = dots[d].p.y;
          dots[d].t.z = Math.min(dots[d].t.z || dots[d].p.z || 1, 5);
          dots[d].p.z = dots[d].t.z;
        }
      }
    },

    switchShape: function (n, fast) {
      var size,
          a = S.Drawing.getArea(),
          d = 0,
          i = 0,
          targetPoint;

      width = n.w;
      height = n.h;

      compensate();
      stableTargets = [];

      if (n.dots.length > dots.length) {
        size = n.dots.length - dots.length;
        for (d = 1; d <= size; d++) {
          dots.push(new S.Dot(a.w / 2, a.h / 2));
        }
      }

      d = 0;

      while (n.dots.length > 0) {
        i = Math.floor(Math.random() * n.dots.length);
        dots[d].clearQueue();
        dots[d].e = fast ? 0.25 : dots[d].s ? 0.14 : 0.11;

        if (dots[d].s) {
          dots[d].move(
            new S.Point({
              z: Math.random() * 20 + 10,
              a: Math.random(),
              h: 18,
            })
          );
        } else {
          dots[d].move(
            new S.Point({
              z: Math.random() * 5 + 5,
              h: fast ? 18 : 30,
            })
          );
        }

        dots[d].s = true;
        targetPoint = clampPoint(new S.Point({
          x: n.dots[i].x + cx,
          y: n.dots[i].y + cy,
          a: 1,
          z: n.r || 5,
          h: 0,
        }));
        stableTargets[d] = targetPoint;
        dots[d].move(
          targetPoint
        );

        n.dots = n.dots.slice(0, i).concat(n.dots.slice(i + 1));
        d++;
      }

      for (i = d; i < dots.length; i++) {
        if (dots[i].s) {
          dots[i].clearQueue();
          dots[i].move(
            new S.Point({
              z: Math.random() * 20 + 10,
              a: Math.random(),
              h: 20,
            })
          );

          dots[i].s = false;
          dots[i].e = 0.04;
          dots[i].move(
            clampPoint(new S.Point({
              x: dots[i].p.x + Math.random() * 90 - 45,
              y: dots[i].p.y + Math.random() * 90 - 45,
              a: 0.3, //.4
              z: Math.random() * 4,
              h: 0,
            }))
          );
        }
      }
    },

    render: function () {
      for (var d = 0; d < dots.length; d++) {
        dots[d].render();
      }
    }
  };
}());
