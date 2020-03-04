/**
 * Onigiri sprite in 3D 
 * To make it act like a billboard, use sprite3D.object3d.lookAt(Onigiri.camera)
 * @moduleName Sprite3D
 * @snippet Sprite3D|Constructor
Sprite3D({
    width: ${1:32 * Onigiri.pxToThree},
    height: ${2:null},
    imageName: '${3}',
    position: new THREE.Vector3(${4:0}, ${5:0}, ${6:0}),
    originRelative: new Vector2(${7:0.5}, ${8:0.5}),
    frameCountX: ${9:1},
    frameCountY: ${10:1},
    animations: {
        default: {
            speed: 0,
            frames: [0]
        }
    }
})
 */
bento.define('onigiri/sprite3d', [
    'bento',
    'bento/utils',
    'bento/components/three/sprite',
    'onigiri/entity3d',
    'onigiri/onigiri',
    'bento/math/vector2',
    'bento/math/rectangle'
], function (
    Bento,
    Utils,
    ThreeSprite,
    Entity3D,
    Onigiri,
    Vector2,
    Rectangle
) {
    'use strict';
    // PlaneSprite is ThreeSprite with the 2d behaviors removed
    var PlaneSprite = function (settings) {
        ThreeSprite.call(this, settings);
        this.object3D.visible = true;
    };
    PlaneSprite.prototype = Object.create(ThreeSprite.prototype);
    PlaneSprite.prototype.constructor = PlaneSprite;
    // overwrite start, destroy and draw behaviors, which are 2d-Bento specific
    PlaneSprite.prototype.start = function (data) {};
    PlaneSprite.prototype.destroy = function (data) {};
    PlaneSprite.prototype.draw = function () {
        var origin = this.origin;
        var mesh = this.mesh;
        var currentFrame = Math.round(this.currentFrame);
        var currentAnimation = this.currentAnimation;

        if (!this.currentAnimation || !this.visible || !this.spriteImage) {
            // there is nothing to draw
            this.object3D.visible = false;
            return;
        } else {
            this.object3D.visible = true;
        }

        if (this.lastFrame !== currentFrame || this.lastAnimation !== currentAnimation) {
            // prevent updating the uvs all the time
            this.updateFrame();
            this.updateUvs();
            this.lastFrame = currentFrame;
            this.lastAnimation = currentAnimation;
        }

        // origin: to achieve this offset effect, we move the plane (child of the object3d)
        // take into account that threejs already assumes middle of the mesh to be origin
        mesh.position.x = -origin.x;
        mesh.position.y = origin.y - this.frameHeight;

    };

    /**
     * Onigiri Sprite 3D, which acts like a sprite container
     * In other words, the Sprite3D is an Entity3D, if you need access to the sprite, use sprite3d.sprite
     */
    var Sprite3D = function (settings) {
        var desiredDimension = settings.desiredDimension || new Rectangle(0, 0, settings.width || 0, settings.height || 0);
        var targetDimension = new Rectangle(0, 0, 0, 0);
        var hasWidth = !!(desiredDimension.width);
        var hasHeight = !!(desiredDimension.height);

        var parent;
        var sprite = new PlaneSprite(Utils.extend(settings, {
            originRelative: settings.originRelative || new Vector2(0.5, 0.5)
        }, true));
        var behavior = {
            name: 'hdSpriteBehavior',
            start: function () {
                // apply scaling
                behavior.setupDimensions();
            },
            onParentAttached: function (data) {
                parent = data.parent;
            },
            getDesiredDimensions: function (data) {
                // re-initialize desiredDimension from settings object
                desiredDimension = data.desiredDimension || new Rectangle(0, 0, data.width || 0, data.height || 0);
                hasWidth = !!(desiredDimension.width);
                hasHeight = !!(desiredDimension.height);
            },
            setupDimensions: function () {
                // note: taken from HDSprite, there are some leftover functionality such as
                // inheriting the dimension of the sprite
                var ratio;

                // apply target dimensions
                if (hasWidth) {
                    targetDimension.width = desiredDimension.width;
                }
                if (hasHeight) {
                    targetDimension.height = desiredDimension.height;
                }

                // hd graphic's parent dimension will become the desired dimension
                if (parent) {
                    parent.dimension.width = targetDimension.width;
                    parent.dimension.height = targetDimension.height;
                }

                entity.scale.x = targetDimension.width / sprite.frameWidth;
                entity.scale.y = targetDimension.height / sprite.frameHeight;

                ratio = sprite.frameWidth / sprite.frameHeight;

                // one of parameters was not given
                if (!hasWidth) {
                    entity.scale.x = entity.scale.y;
                    parent.dimension.width = targetDimension.height * ratio;
                }
                if (!hasHeight) {
                    entity.scale.y = entity.scale.x;
                    parent.dimension.height = targetDimension.width / ratio;
                }
                // both parameters are not passed: just use the original width and height
                if (!hasWidth && !hasHeight) {
                    entity.scale.x = 1;
                    entity.scale.y = 1;
                    parent.dimension.width = sprite.frameWidth;
                    parent.dimension.height = sprite.frameHeight;
                }
                parent.dimension.x = -sprite.origin.x * entity.scale.x;
                parent.dimension.y = -sprite.origin.y * entity.scale.y;

                // also set dimension of this entity
                entity.dimension.x = parent.dimension.x || 0;
                entity.dimension.y = parent.dimension.y || 0;
                entity.dimension.width = parent.dimension.width || 0;
                entity.dimension.height = parent.dimension.height || 0;
            }
        };
        var entity = new Entity3D(Utils.extend(settings, {
            name: 'sprite3D',
            object3D: sprite.object3D
        }, true)).extend({
            /**
             * Expose sprite component
             * @snippet #Sprite3D.sprite|Sprite
                sprite
             */
            sprite: sprite,
            /**
             * use sprite3d.setup() instead of sprite3d.sprite.setup() if you should re-pass a desired dimension
             * @snippet #Sprite3D.setup()|Snippet
                setup({
                    width: ${1:32 * Onigiri.pxToThree},
                    height: ${2:null},
                    imageName: '${3}',
                    position: new THREE.Vector3(${4:0}, ${5:0}, ${6:0}),
                    originRelative: new Vector2(${7:0.5}, ${8:0.5}),
                    frameCountX: ${9:1},
                    frameCountY: ${10:1},
                    animations: {
                        default: {
                            speed: 0,
                            frames: [0]
                        }
                    }
                })
             */
            setup: function (data) {
                sprite.setup(Utils.extend(data, {
                    originRelative: data.originRelative || new Vector2(0.5, 0.5)
                }, true));
                
                // retrieve width/height
                behavior.getDesiredDimensions(data);

                // apply scaling again
                behavior.setupDimensions();
            }
        });

        entity.attach(behavior);
        entity.attach(sprite);

        return entity;
    };
    Sprite3D.addToOnigiri = function () {
        Onigiri.Sprite3D = Sprite3D;
        console.log('Onigiri: added Onigiri.Sprite3D');
    };
    return Sprite3D;
});