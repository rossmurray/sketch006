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
        const pstring = '#383838,#813CD6,#41AB8B,#00E0FF';
        //const pstring = 'black,white,black';
        //const pstring = 'teal,#CE70BC,#9258C8';
        const palette = pstring.split(',');
        const sequence = [11,14,8,3];
        const colors = palette.slice(0, sequence.length);
        const patternRepeats = 4;
        const twillWidth = 4;
        const mergePatternEnds = false;
        const showWarp = true;
        const showWeft = true;
        const stripeBlendMode = PIXI.BLEND_MODES.NORMAL;
        const backgroundColor = colorNameToNumber('black');
        const screenMargin = 0;
        const colorScale = chroma.scale(palette).mode('hsl'); //modes: lch, lab, hsl, rgb
        const cyclePause = 0;
        const config = {
            sequence: sequence,
            colors: colors,
            stripeBlendMode: stripeBlendMode,
            patternRepeats: patternRepeats,
            palette: palette,
            cyclePause: cyclePause,
            screenMargin: screenMargin,
            colorScale: colorScale,
            backgroundColor: backgroundColor,
            twillWidth: twillWidth,
            mergePatternEnds: mergePatternEnds,
            showWarp: showWarp,
            showWeft: showWeft,
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
                //.saturate(1)
                .name();
            gradient.addColorStop(p, color);
        }
        context.fillStyle = gradient;
        context.fillRect(0, 0, screenRect.width, screenRect.height);
        const texture = PIXI.Texture.fromCanvas(canvasElement);
        const sprite = new PIXI.Sprite(texture);
        return sprite;
    }

    function makeMaskSprite(config, board, renderer) {
        const width = board.width;
        const height = board.height;
        const canvasElement = document.createElement('canvas');
        canvasElement.width = width;
        canvasElement.height = height;
        const ctx = canvasElement.getContext('2d');
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        if(data.length < (width * height)) { throw "mask wasn't large enough."; }
        for(let j = 0; j < width; j++) {
            for(let k = 0; k < height; k++) {
                if(((j+k) % (config.twillWidth * 2)) < config.twillWidth) {
                const t = (k * width + j) * 4;
                data[t] = 255;
                data[t+1] = 255;
                data[t+2] = 255;
                data[t+3] = 255;
                }
            }
        }
        ctx.putImageData(imgData, 0, 0);
        const texture = PIXI.Texture.fromCanvas(canvasElement);
        const sprite = new PIXI.Sprite(texture);
        sprite.x = board.left;
        sprite.y = board.top;
        return sprite;
    }

    function makePattern(config, board, renderer) {
        function mirrorAndRepeat(seq, repeatCount) {
            const cutoff = config.mergePatternEnds ? 1 : 0;
            const mirrored = seq.concat(seq.slice(0, seq.length - cutoff).reverse());
            let repeated = [];
            for(let i = 0; i < repeatCount; i++) {
                for(let m of mirrored.slice(0, mirrored.length - cutoff)) {
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
            const boardScalar = longDimension / sum;
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
        const mask = makeMaskSprite(config, board, renderer);
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
            sprite.mask = mask;
            return {sprite: sprite};
        });
        let result = [];
        if(config.showWarp == true) { result = result.concat(warpSprites); }
        if(config.showWeft == true) { result = result.concat(weftSprites); }
        return result;
    }

    function animateShapes(shapes, board, config) {
        const timeline = anime.timeline({
            autoplay: false,
            loop: true,
            duration: 0,
        });
        const dummy = {x:0};
        for(let i = 0; i < shapes.length; i++) {
            const shape = shapes[i];
            // timeline.add({
            //     targets: shape.sprite.scale,
            //     x: shrinkAnimation,
            //     y: shrinkAnimation,
            //     easing: config.shrinkEasing,
            //     offset: offset,
            // });
        }
        // timeline.add({
        //     targets: dummy,
        //     x: 0,
        //     duration: config.cyclePause,
        // });
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
        const shapes = makePattern(config, board, app.renderer);
        //const background = makeBackground(config, app.screen, app.renderer);
        const background = makeMaskSprite(config, board, app.renderer);
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