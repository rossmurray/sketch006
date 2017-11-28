var fnMain = (function() {
    function render(deltaMs, state) {
        requestAnimationFrame(function(timestamp){
            render(timestamp, state);
        });
        state.app.renderer.render(state.app.stage);
        state.recorder.capture(state.app.renderer.view);
    }

    function getConfig() {
        //const pstring = '#0D0D0D,#2EB8AF,#F1F527,#2EB8AF,#06295E';
        const pstring = '#383838,#913CE6,#41AB8B,#00E0FF';
        //const pstring = 'black,white,black';
        //const pstring = 'teal,#CE70BC,#9258C8';
        const palette = pstring.split(',');
        const sequence = [11,14,8,3];
        const colors = palette.slice(0, sequence.length);
        const config = {
            sequence: sequence,
            colors: colors,
            stripeBlendMode: PIXI.BLEND_MODES.ADD,
            patternRepeats: 12,

            shapeRadius: 0.045, //relative to board
            shapeHolePercent: 1.0,
            hexOuterBorderWidth: 0.1, //percent of shape diameter
            hexInnerBorderWidth: 0.04,
            shrinkPercent: 0.8,
            animationDuration: 1700,
            animationOffset: 1,
            cyclePause: 000,
            shrinkEasing: 'easeInOutElastic',
            spinEasing: 'easeInOutElastic',
            screenMargin: 0, //percent of each axis not included in 'board' rectangle
            //colorScale: chroma.bezier(palette), //modes: lch, lab, hsl, rgb
            colorScale: chroma.scale(palette).padding([0,0.3]).mode('lch'), //modes: lch, lab, hsl, rgb
            shapeAlpha: 1,
            shapeBlendMode: PIXI.BLEND_MODES.MULTIPLY,
            palette: palette,
            backgroundColor: colorNameToNumber('black'),
            hexInnerBorderColor: 'black',
            hexQuadColors: ['white','#AAAAAA','#DDDDDD'],
            //hexQuadColors: ['black','black','black'],
        };
        return config;
    }

    function makeBoardRectangle(margin, viewRectangle) {
        const xmargin = margin * viewRectangle.width;
        const ymargin = margin * viewRectangle.height;
        const boardWidth = viewRectangle.width - (xmargin * 2);
        const boardHeight = viewRectangle.height - (ymargin * 2);
        return new PIXI.Rectangle(xmargin, ymargin, boardWidth, boardHeight);
    }

    function makeRange(n) {
        var arr = Array.apply(null, Array(n));
        return arr.map(function (x, i) { return i });
    };

    function RGBTo24bit(rgbArray) {
        let result = Math.floor(rgbArray[2])
            | Math.floor(rgbArray[1]) << 8
            | Math.floor(rgbArray[0]) << 16;
        return result;
    }

    function colorNameToNumber(name) {
        return RGBTo24bit(chroma(name).rgb());
    }

    function colorNumberToName(number) {
        return chroma(number).name();
    }

    function portion(i, size) {
        return i / ((size -1) || 1);
    }

    function makeBackground(config, screenRect, renderer) {
        const canvasElement = document.createElement('canvas');
        canvasElement.width = screenRect.width;
        canvasElement.height = screenRect.height;
        const context = canvasElement.getContext('2d');
        const gradient = context.createLinearGradient(screenRect.x, screenRect.y, screenRect.width, screenRect.height);
        const steps = 10;
        for(let i = 0; i < steps; i++) {
            const p = portion(i,steps);
            const color = config.colorScale(p)
                //.brighten(1)
                .saturate(1)
                .name();
            gradient.addColorStop(p, color);
        }
        context.fillStyle = gradient;
        context.fillRect(0, 0, screenRect.width, screenRect.height);
        //----
        const texture = PIXI.Texture.fromCanvas(canvasElement);
        const sprite = new PIXI.Sprite(texture);
        return sprite;
    }

    function createHexagonTexture(config, renderer) {
        const radius = config.shapeRadius;
        const diameter = radius * 2;
        const g = new PIXI.Graphics();
        g.width = diameter;
        g.height = diameter;
        const innerPoints = getHexagonPoints(radius, radius, radius);
        const outerPoints = getHexagonPoints(radius, radius, radius);
        function getQuad(n) {
            const mid = [new PIXI.Point(radius, radius)];
            const edges = [0,1,2].map(x => (x + 2 * n) % 6).map(x => outerPoints[x]);
            return mid.concat(edges);
        }
        //draw quad 0
        g.beginFill(colorNameToNumber(config.hexQuadColors[0]), config.shapeAlpha);
        const quad0 = getQuad(0);
        g.drawPolygon(quad0);
        g.endFill();

        //draw quad 1
        g.beginFill(colorNameToNumber(config.hexQuadColors[1]), config.shapeAlpha);
        const quad1 = getQuad(1);
        g.drawPolygon(quad1);
        g.endFill();

        //draw quad 2
        g.beginFill(colorNameToNumber(config.hexQuadColors[2]), config.shapeAlpha);
        const quad2 = getQuad(2);
        g.drawPolygon(quad2);
        g.endFill();

        //draw inner border
        const innerBorderWidth = Math.round(config.hexInnerBorderWidth * diameter);
        g.lineStyle(innerBorderWidth, colorNameToNumber(config.hexInnerBorderColor));
        g.moveTo(radius, radius);
        g.lineTo(outerPoints[0].x, outerPoints[0].y)
        g.moveTo(radius, radius);
        g.lineTo(outerPoints[2].x, outerPoints[2].y)
        g.moveTo(radius, radius);
        g.lineTo(outerPoints[4].x, outerPoints[4].y)
        g.lineStyle(0);

        //todo draw outer border

        //const smallerRadius = Math.round(config.shapeRadius * config.shapeHolePercent);
        //const polygonPoints = drawHexagon(g, config.shapeRadius, config.shapeRadius, config.shapeRadius, 0x0, config.shapeAlpha);
        //drawHexagon(g, config.shapeRadius, config.shapeRadius, smallerRadius, config.backgroundColor, config.shapeAlpha);
        const texture = PIXI.RenderTexture.create(diameter, diameter);
        renderer.render(g, texture);
        return texture;
    }

    function getHexagonPoints(centerX, centerY, radius) {
        const sides = 6;
        const points = makeRange(sides).map((x,i) => {
            const amountAround = i / sides;
            const vx = radius * Math.cos(Math.PI * 2 * amountAround) + centerX;
            const vy = radius * Math.sin(Math.PI * 2 * amountAround) + centerY;
            const point = new PIXI.Point(Math.round(vx), Math.round(vy));
            return point;
        });
        points[2].x = points[4].x;
        //todo adjust more
        return points;
    }

    function drawHexagon(graphics, centerX, centerY, radius, color24, alpha) {
        graphics.beginFill(color24, alpha);
        const sides = 6;
        const points = makeRange(sides).map((x,i) => {
            const amountAround = i / sides;
            const vx = radius * Math.cos(Math.PI * 2 * amountAround) + centerX;
            const vy = radius * Math.sin(Math.PI * 2 * amountAround) + centerY;
            const point = new PIXI.Point(Math.round(vx) + 0, Math.round(vy) + 0);
            return point;
        });
        //fix precision error (?) with shape vertices.
        points[2].x = points[4].x;

        graphics.drawPolygon(points);
        graphics.endFill();
        graphics.lineStyle(5, 0xFFFFFF);
        graphics.moveTo(Math.round(centerX),Math.round(centerY));
        graphics.lineTo(points[0].x, points[0].y)
        graphics.moveTo(Math.round(centerX),Math.round(centerY));
        graphics.lineTo(points[2].x, points[2].y)
        graphics.moveTo(Math.round(centerX),Math.round(centerY));
        graphics.lineTo(points[4].x, points[4].y)
        graphics.lineStyle(0);
        return points;
    }

    function makePattern(config, board, renderer) {
        function mirrorAndRepeat(seq, repeatCount) {
            const mirrored = seq.concat(seq.slice().reverse());
            let repeated = [];
            for(let i = 0; i < repeatCount; i++) {
                for(let m of mirrored) {
                    repeated.push(m);
                }
            }
            return repeated;
        }
        const colors = mirrorAndRepeat(config.colors, config.patternRepeats);
        function sequenceToShapes(sequence, setter) {
            const render = mirrorAndRepeat(config.sequence, config.patternRepeats);
            const sum = render.reduce((a,b) => a + b);
            if(sum < 1) { throw "sequence must be positive"; }
            const longDimension = board.width < board.height ? board.height : board.width;
            const boardScalar = Math.round(longDimension / sum);
            const intervals = render.map(x => x * boardScalar);
            const shapes = intervals.map((interval, index) => {
                const result = {
                    width: board.width,
                    height: board.height,
                    y: board.top,
                    x: board.left,
                    color: colors[index],
                };
                setter(result, interval);
                return result;
            }).filter(s => s.x <= board.right && s.y <= board.bottom);
            return shapes;
        }
        function mapSprite(obj) {
            const width = obj.width;
            const height = obj.height;
            const gfx = new PIXI.Graphics();
            gfx.width = width;
            gfx.height = height;
            const color = colorNameToNumber(obj.color);
            gfx.beginFill(color);
            gfx.drawRect(0, 0, width, height);
            gfx.endFill();
            const texture = PIXI.RenderTexture.create(width, height);
            renderer.render(gfx, texture);
            const sprite = new PIXI.Sprite(texture);
            sprite.x = obj.x;
            sprite.y = obj.y;
            sprite.blendMode = config.stripeBlendMode;
            return sprite;
        }
        const talls = sequenceToShapes(config.sequence, (a,b) => {a.width = b;});
        const wides = sequenceToShapes(config.sequence, (a,b) => {a.height = b;});
        let leftCounter = board.left;
        let topCounter = board.top;
        const warpSprites = talls.map(s => {
            s.x = leftCounter;
            leftCounter += s.width;
            const sprite = mapSprite(s);
            return {sprite: sprite};
        });
        const weftSprites = wides.map(s => {
            s.y = topCounter;
            topCounter += s.height;
            const sprite = mapSprite(s);
            return {sprite: sprite};
        });
        const result = warpSprites.concat(weftSprites);
        return result;
    }

    function makeShapes(config, board, renderer) {
        const diameter = config.shapeRadius * 2;
        //const testPoints = drawHexagon(new PIXI.Graphics(), config.shapeRadius, config.shapeRadius, config.shapeRadius, config.backgroundColor, 1);
        const testPoints = getHexagonPoints(config.shapeRadius, config.shapeRadius, config.shapeRadius);
        const shapeWidth = testPoints[2].y - testPoints[4].y;
        const shapeHeight = (diameter + (testPoints[1].x - testPoints[2].x)) / 2;
        const colCount = Math.ceil(board.width / shapeWidth) + 2;
        const rowCount = Math.ceil(board.height / shapeHeight) + 2;
        const shapeCount = colCount * rowCount;
        const diagDist = function(j,k) {
            return (portion(j,colCount) + portion(k,rowCount)) / 2;
        };
        const shapes = makeRange(shapeCount).map(() => {return {};});
        const texture = createHexagonTexture(config, renderer);
        for(let j = 0; j < colCount; j++) { //columns
            for(let k = 0; k < rowCount; k++) { //rows
                const i = k + rowCount * j;
                const shape = shapes[i];
                // const g = new PIXI.Graphics();
                // g.width = diameter;
                // g.height = diameter;
                // const color = RGBTo24bit(config.colorScale(diagDist(j,k)).rgb());
                // const smallerRadius = Math.round(config.shapeRadius * config.shapeHolePercent);
                // const polygonPoints = drawHexagon(g, config.shapeRadius, config.shapeRadius, config.shapeRadius, 0x0, config.shapeAlpha);
                // drawHexagon(g, config.shapeRadius, config.shapeRadius, smallerRadius, config.backgroundColor, config.shapeAlpha);
                // const texture = PIXI.RenderTexture.create(diameter, diameter);
                // renderer.render(g, texture);
                const sprite = new PIXI.Sprite(texture);
                const evenRow = (k % 2 == 0);
                const rowShift = evenRow ? -0.4 * shapeWidth : shapeWidth * -0.9;
                const colShift = shapeHeight * -0.4;
                const rotShift = 0;//((i % 3) / 3) * Math.PI * 2;
                sprite.x = Math.round(rowShift + board.left + j * (shapeWidth - 1));
                sprite.y = Math.round(colShift + board.top + k * (shapeHeight - 1));
                sprite.anchor.set(0.5, 0.5);
                sprite.blendMode = config.shapeBlendMode;
                sprite.rotation = Math.PI * 0.5 + rotShift;
                shape.sprite = sprite;
            }
        }
        return shapes;
    }

    function animateShapes(shapes, board, config) {
        const timeline = anime.timeline({
            autoplay: false,
            loop: true,
            duration: 0,
        });
        const dummy = {x:0};
        const distFromMid = function() {
            const midX = board.left + (board.width / 2);
            const midY = board.top + (board.height / 2);
            const maxDistance = Math.sqrt(board.width*board.width + board.height*board.height) / 2;
            return function(point) {
                const dx = (point.x - midX) / maxDistance;
                const dy = (point.y - midY) / maxDistance;
                const result = Math.sqrt(dx*dx + dy*dy);
                console.log(result);
                return result;// / maxDistance;
            };
        }();
        for(let i = 0; i < shapes.length; i++) {
            const shape = shapes[i];
            const pauseInterval = config.animationDuration * config.animationOffset;
            const offset = (1-distFromMid(shape.sprite)) * pauseInterval;
            const initialRotation = shape.sprite.rotation;
            const rotations = [Math.PI * 2/3, Math.PI * 4/3, Math.PI * 2].map(x => x + initialRotation);
            const r = rotations;
            const halfDuration = config.animationDuration / 2;
            const shrink = {value: config.shrinkPercent, duration: halfDuration};
            const unshrink = {value: 1, duration: halfDuration};
            const pause = x => {return{value: x, duration: pauseInterval};};
            const spin = x => {return{value: rotations[x], duration: config.animationDuration};}
            const shrinkAnimation = [shrink,unshrink,pause(1),shrink,unshrink,pause(1),shrink,unshrink];
            const spinAnimation = [spin(0), pause(r[0]), spin(1), pause(r[1]), spin(2)];
            timeline.add({
                targets: shape.sprite.scale,
                x: shrinkAnimation,
                y: shrinkAnimation,
                easing: config.shrinkEasing,
                offset: offset,
            }).add({
                targets: shape.sprite,
                rotation: spinAnimation,
                easing: config.spinEasing,
                offset: offset,
            });
        }
        timeline.add({
            targets: dummy,
            x: 0,
            duration: config.cyclePause,
        });
        return timeline;
    }

    return (function() {
        const config = getConfig();
        const mainel = document.getElementById("main");
        let app = new PIXI.Application({
            width: mainel.width,
            height: mainel.height,
            view: mainel,
            autoResize: true,
            antialias: true,
            autoStart: false,
        });
        app.renderer.backgroundColor = config.backgroundColor;
        app.renderer.render(app.stage);
        //note: this prevents ticker starting when a listener is added. not when the application starts.
        app.ticker.autoStart = false;
        app.ticker.stop();

        let board = makeBoardRectangle(config.screenMargin, app.screen);
        const smaller = board.width < board.height ? board.width : board.height;
        config.shapeRadius = Math.round(config.shapeRadius * smaller);
        const shapes = makePattern(config, board, app.renderer);
        const background = makeBackground(config, app.screen, app.renderer);
        //app.stage.addChild(background);
        for(let s of shapes) {
            app.stage.addChild(s.sprite);
        }
        //const animation = animateShapes(shapes, board, config);
        const animation = {};
        let state = {
            config: config,
            app: app,
            board: board,
            animation: animation,
            shapes: shapes,
            background: background,
        };
        return function(recorder) {
            state.recorder = recorder || {capture: function(){}};
            app.start();
            render(Date.now(), state);
            //animation.play();
            return state;
        }
    })();
})();