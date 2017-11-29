var fnMain = (function() {
    function render(deltaMs, state) {
        requestAnimationFrame(function(timestamp){
            render(timestamp, state);
        });
        state.app.renderer.render(state.app.stage);
        state.recorder.capture(state.app.renderer.view);
    }

    function getConfig() {
        const sequencePairs = generateSequence();
        const sequence = sequencePairs.map(x => x.width);
        const colors = sequencePairs.map(x => x.color);
        const patternRepeats = 1;
        const twillWidth = 4;
        const mergePatternEnds = false;
        const showWarp = true;
        const showWeft = true;
        const stripeBlendMode = PIXI.BLEND_MODES.NORMAL;
        const backgroundColor = colorNameToNumber('magenta');
        const screenMargin = 0;
        const cyclePause = 0;
        const config = {
            sequence: sequence,
            colors: colors,
            stripeBlendMode: stripeBlendMode,
            patternRepeats: patternRepeats,
            cyclePause: cyclePause,
            screenMargin: screenMargin,
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

    function generateSequence() {
        //const manual = [{"width":95,"color":"#1C0070"},{"width":32,"color":"#101010"},{"width":32,"color":"#006818"},{"width":8,"color":"#440044"},{"width":32,"color":"#006818"},{"width":8,"color":"#101010"},{"width":8,"color":"#FCFCFC"}];
        //const manual = [{"width":9,"color":"#C80000"},{"width":51,"color":"#006818"},{"width":9,"color":"#2C2C80"},{"width":34,"color":"#006818"},{"width":77,"color":"#2C2C80"},{"width":13,"color":"#F8F8F8"},{"width":9,"color":"#C80000"},{"width":9,"color":"#F8F8F8"}];
        const manual = [{"width":4,"color":"#2C2C80"},{"width":4,"color":"#101010"},{"width":32,"color":"#2C2C80"},{"width":30,"color":"#101010"},{"width":4,"color":"#E8C000"},{"width":32,"color":"#006818"},{"width":4,"color":"#101010"},{"width":32,"color":"#006818"},{"width":4,"color":"#E0E0E0"},{"width":34,"color":"#101010"},{"width":8,"color":"#1C0070"},{"width":12,"color":"#D05054"},{"width":6,"color":"#101010"},{"width":4,"color":"#E8C000"}];
        //const manual = [{"width":8,"color":"#E0E0E0"},{"width":6,"color":"#1474B4"},{"width":6,"color":"#E0E0E0"},{"width":6,"color":"#1474B4"},{"width":3,"color":"#E0E0E0"},{"width":69,"color":"#1474B4"},{"width":11,"color":"#003C64"},{"width":11,"color":"#888888"},{"width":3,"color":"#5C8CA8"},{"width":3,"color":"#888888"},{"width":3,"color":"#5C8CA8"},{"width":11,"color":"#888888"},{"width":11,"color":"#003C64"},{"width":3,"color":"#901C38"},{"width":3,"color":"#003C64"},{"width":8,"color":"#901C38"},{"width":3,"color":"#003C64"},{"width":3,"color":"#901C38"},{"width":11,"color":"#003C64"},{"width":3,"color":"#E0E0E0"},{"width":6,"color":"#003C64"},{"width":8,"color":"#E0E0E0"},{"width":14,"color":"#C80000"}];
        //const manual = [{"width":13,"color":"#A8ACE8"},{"width":3,"color":"#101010"},{"width":47,"color":"#1C0070"},{"width":27,"color":"#101010"},{"width":20,"color":"#1C0070"},{"width":7,"color":"#880000"},{"width":20,"color":"#1C0070"},{"width":10,"color":"#880000"},{"width":20,"color":"#1C0070"},{"width":7,"color":"#880000"},{"width":20,"color":"#1C0070"},{"width":7,"color":"#101010"},{"width":7,"color":"#D09800"}];
        return manual;
    }

    function makeBackground(config, screenRect, renderer) {
        const canvasElement = document.createElement('canvas');
        canvasElement.width = screenRect.width;
        canvasElement.height = screenRect.height;
        const context = canvasElement.getContext('2d');
        context.fillStyle = config.backgroundColor;
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
                const d = config.twillWidth * 2;
                const r = config.twillWidth;
                //if((k % 2 == 0 && j % d < r) || k % 2 == 1 && j % d > 2) {
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
        const background = makeBackground(config, app.screen, app.renderer);
        //const background = makeMaskSprite(config, board, app.renderer);
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