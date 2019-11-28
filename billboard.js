// NEEDS ONIGIRI INTEGRATION

bento.define('onigiri/billboard', [
    'bento/utils',
    'onigiri/onigiri',
    'bento/components/sprite',
    'bento'
], function (
    Utils,
    Onigiri,
    Sprite,
    Bento
) {
    'use strict';
    /* @snippet Billboard - Onigiri
    Onigiri.Billboard({
        image: '${1}',
        // dispose : true,
        start: function (data) {},
        update: function (data) {},
        attached: function (data) {}
    });
    */
    var Billboard = function (settings) {
        var texture = Bento.assets.getTexture(settings.image);
        var billboardMaterial = new THREE.SpriteMaterial({
            map: texture,
            color: 0xffffff,
            alphaTest: 0.1
        });
        var sprite = new THREE.Sprite(billboardMaterial);
        var component = {
            name: settings.name || 'planeImage',
            dispose: Utils.getDefault(settings.dispose, true),
            sprite: sprite,
            start: function (data) {
                if (sprite) {
                    Onigiri.scene.add(sprite);
                }
                if (settings.start) {
                    // bind this to function and call start function
                    (settings.start.bind(this))(data);
                }
            },
            destroy: function (data) {
                if (sprite && sprite.parent) {
                    Onigiri.scene.remove(sprite);
                    if (this.dispose) {
                        sprite.geometry.dispose();
                        Onigiri.scene.dispose();
                    }
                }
            },
            update: function (data) {
                if (settings.update) {
                    (settings.update.bind(this))(data);
                }
            },
            attached: settings.attached
        };
        return component;
    };

    /* @snippet Onigiri.SpriteBillboard.snippet
    Onigiri.SpriteBillboard({
        spriteSheet: '${1}'
    })
     * @snippet Onigiri.SpriteBillboard|imageName
    Onigiri.SpriteBillboard({
        imageName: '${1}',
        originRelative: new Vector2(${2:0.5}, ${3:0.5}),
        frameCountX: ${4:1},
        frameCountY: ${5:1},
        animations: {
            default: {
                speed: 0,
                frames: [0]
            }
        }
    })
     */
    var SpriteBillboard = function (settings) {
        if (!(this instanceof Onigiri.SpriteBillboard)) {
            return new Onigiri.SpriteBillboard(settings);
        }

        // ThreeJS specific
        this.material = null;
        this.geometry = null;
        this.texture = null;
        this.plane = null;
        this.container = new THREE.Object3D();
        this.autoAttach = Utils.getDefault(settings.autoAttach, true);
        this.dispose = Utils.getDefault(settings.dispose, true);

        // checking if frame changed
        this.lastFrame = null;

        Sprite.call(this, settings);

        this.name = settings.name || 'planeSprite';
    };

    SpriteBillboard.prototype = Object.create(Sprite.prototype);
    SpriteBillboard.prototype.constructor = SpriteBillboard;

    SpriteBillboard.prototype.start = function (data) {
        if (this.autoAttach) {
            Onigiri.scene.add(this.container);
        }
    };

    SpriteBillboard.prototype.destroy = function (data) {
        if (this.autoAttach) {
            Onigiri.scene.remove(this.container);
        }
        this.dispose();
    };

    SpriteBillboard.dispose = function () {
        if (this.dispose && this.plane) {
            this.plane.geometry.dispose();
            this.plane.material.dispose();
        }
    };

    SpriteBillboard.prototype.setup = function (data) {
        var spriteImage;
        var threeTexture;
        var plane;

        Sprite.prototype.setup.call(this, data);

        spriteImage = this.spriteImage;

        // check if we have an image and convert it to a texture
        if (spriteImage) {
            threeTexture = spriteImage.threeTexture;
            if (!threeTexture) {
                threeTexture = new THREE.Texture(spriteImage.image);
                threeTexture.needsUpdate = true;
                threeTexture.magFilter = THREE.NearestFilter;
                threeTexture.minFilter = THREE.NearestFilter;
                spriteImage.threeTexture = threeTexture;
            }
            this.texture = threeTexture;
        } else {
            this.texture = null;
        }

        // create new material
        if (this.texture) {
            // move this also to a image property?
            this.material = new THREE.MeshBasicMaterial({
                map: this.texture,
                color: 0xffffff,
                // side: THREE.DoubleSide,
                alphaTest: 1, // --> prevents glitchy clipping
                transparent: true
            });
            this.geometry = new THREE.PlaneGeometry(
                this.frameWidth * Onigiri.getPxToThree(),
                this.frameHeight * Onigiri.getPxToThree(),
                1,
                1
            );
            // remove existing mesh
            if (this.plane) {
                this.dispose();
                this.container.remove(this.plane);
                this.plane = null;
            }

            plane = new THREE.Mesh(this.geometry, this.material);
            this.plane = plane;

            // game specific?
            this.container.rotation.x = -Math.PI / 2; // makes the mesh stand up, note: local axis changes

            this.lastFrame = this.currentFrame;
            this.updateFrame();
            this.updateUvs();

            this.container.add(plane);

            // origin
            // take into account that threejs already assumes middle of the mesh to be origin
            plane.position.x = (this.frameWidth - this.origin.x - this.frameWidth / 2) * Onigiri.pxToThree;
            plane.position.y = (this.origin.y - this.frameHeight / 2) * Onigiri.pxToThree;
        } else {
            // remove existing mesh
            if (this.plane) {
                this.container.remove(this.plane);
                this.plane = null;
            }
        }
    };
    SpriteBillboard.prototype.update = function (data) {
        Sprite.prototype.update.call(this, data);

        if (this.lastFrame !== this.currentFrame) {
            // prevent updating the uvs all the time
            this.updateFrame();
            this.updateUvs();
        }
        this.lastFrame = this.currentFrame;
    };
    SpriteBillboard.prototype.draw = function (data) {
        // BentoSprite is not responsible for drawing on screen, only calculating the UVs
    };

    SpriteBillboard.prototype.updateUvs = function () {
        //
        var sourceX = this.sourceX;
        var sourceY = this.sourceY;
        var spriteImage = this.spriteImage;
        var image = spriteImage.image;
        var imageWidth = image.width;
        var imageHeight = image.height;
        // var origin = this.origin; // -> what to do with this

        var sx = sourceX + spriteImage.x;
        var sy = sourceY + spriteImage.y;

        var u = sx / imageWidth;
        var v = 1 - sy / imageHeight;
        var w = this.frameWidth / imageWidth;
        var h = this.frameHeight / imageHeight;

        var uvs;

        if (this.geometry && this.plane) {
            uvs = this.geometry.faceVertexUvs[0];
            uvs[0][0].set(u, v);
            uvs[0][1].set(u, v - h);
            uvs[0][2].set(u + w, v);
            uvs[1][0].set(u, v - h);
            uvs[1][1].set(u + w, v - h);
            uvs[1][2].set(u + w, v);

            this.geometry.uvsNeedUpdate = true;
        }
    };

    SpriteBillboard.prototype.attached = function (data) {
        Sprite.prototype.attached.call(this, data);

        // inherit name
        this.container.name = this.parent.name + '.' + this.name;
        if (this.plane) {
            this.plane.name = this.container.name + '.plane';
        }
    };

    Billboard.addToOnigiri = function () {
        Onigiri.Billboard = Billboard;
        console.log("Onigiri: added Onigiri.Billboard");
        Onigiri.SpriteBillboard = SpriteBillboard;
        console.log("Onigiri: added Onigiri.SpriteBillboard");
    };
    console.log("Onigiri: added Onigiri.SpriteBillboard");
    return Billboard;
});