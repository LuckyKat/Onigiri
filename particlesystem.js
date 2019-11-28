// TODO: NEEDS REWRITE

bento.define('onigir/particlesystem', [
    'bento',
    'bento/utils',
    'onigiri/onigiri'
], function (
    Bento,
    Utils,
    Onigiri
) {
    'use strict';
    // vertex and fragment shader for the particle system
    var vertexShader = `
attribute float size;
attribute float alpha;
attribute float texIndex;
attribute vec3 customColor;
varying float vAlpha;
varying float vTexIndex;
varying vec3 vColor;
void main() {
    vAlpha = alpha;
    vTexIndex = texIndex;
    vColor = customColor;
    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
    gl_PointSize = size * ( 300.0 / -mvPosition.z );
    gl_Position = projectionMatrix * mvPosition;
}`;
    // UGH: '[]' : Index expression must be constant
    var fragmentShader = `
uniform vec3 color;
uniform sampler2D textures[5];
varying float vAlpha;
varying float vTexIndex;
varying vec3 vColor;
void main() {
    gl_FragColor = vec4( color * vColor, 1.0 );
    int texIndex = int(vTexIndex + 0.5);
    if (texIndex == 0) {
        gl_FragColor = gl_FragColor * texture2D( textures[0], gl_PointCoord );
    } else if (texIndex == 1) {
        gl_FragColor = gl_FragColor * texture2D( textures[1], gl_PointCoord );
    } else if (texIndex == 2) {
        gl_FragColor = gl_FragColor * texture2D( textures[2], gl_PointCoord );
    } else if (texIndex == 3) {
        gl_FragColor = gl_FragColor * texture2D( textures[3], gl_PointCoord );
    } else if (texIndex == 4) {
        gl_FragColor = gl_FragColor * texture2D( textures[4], gl_PointCoord );
    }
    gl_FragColor.a = vAlpha * gl_FragColor.a;
}`;
    var getUniforms = function (color, textures) {
        var u = {
            color: {
                value: new THREE.Color(0xffffff)
            },
        };
        if (textures) {
            u.textures = {
                value: textures
            };
        }
        return u;
    };
    var getTextures = function (value) {
        if (!value) {
            return;
        }
        var t, textures;
        if (!Utils.isArray(value)) {
            value = [value];
        }
        textures = value.map(function (path) {
            t = Bento.assets.getTexture(path);
            t.flipY = false;
            return t;
        });
        return textures;
    };
    /* @snippet Onigiri.ParticleSystem.snippet
    Onigiri.ParticleSystem({
        textures: '${1}', // maximum of 5 textures, modify fragment shader if you want more.
        amount: ${2:6},
        size: ${3:10},
        color: 0x${4:FFFFFF},
        // alpha: 1,
        // texture: 0,
        // setStartPosition: function (vertex, index) {},
        // setStartColor: function (color, index) {},
        // setStartVelocity: function (vertex, index) {},
        // setStartSize: function (index) {},
        // setStartAlpha: function (index) {},
        // setStartTexture: function (index) {},
        // start: function (data) {},
        // update: function (data) {
        //     //change attributes array to affect the particles (attributes.array.position, attributes.array.customColor, attributes.array.size, attributes.array.alpha, attributes.array.texIndex)
        //     //you can also change the velocity of particles here (not in attributes)
        //     //set addVelocitiesAutomatically to false on this component to be able to add velocities to the particles yourself
        //
        //     //set this if you change the position of the particle(s) and have set addVelocitiesAutomatically to false
        //     //data.positionDirty = true;
        //     //set this if you change the color of the particle(s)
        //     //data.colorDirty = true;
        //     //set this if you change the size of the particle(s)
        //     //data.sizeDirty = true;
        //     //set this if you change the alpha of the particle(s)
        //     //data.alphaDirty = true;
        //     //set this if you change the texture index of the particle(s)
        //     //data.texIndexDirty = true;
        //},
        // attached: function (data) {},
    })
     */
    var ParticleSystem = function (settings) {
        // create the particle variables
        var textures = getTextures(settings.textures);
        var standardColor = Utils.getDefault(settings.color, 0xFFFFFF);
        var standardSize = Utils.getDefault(settings.size, 10);
        var standardAlpha = Utils.getDefault(settings.alpha, 1);
        var standardTexture = settings.texture || 0;
        var uniforms = getUniforms(standardColor, textures);
        var particleCount = settings.amount || 1;
        var activeParticles = particleCount;
        var startPosition = settings.setStartPosition;
        var startColor = settings.setStartColor;
        var startSize = settings.setStartSize || function () {
            return standardSize;
        };
        var startAlpha = settings.setStartAlpha || function () {
            return standardAlpha;
        };
        var startTexture = settings.setStartTexture || function () {
            return standardTexture;
        };
        var startVelocity = settings.setStartVelocity;

        //arrays
        var positions = new Float32Array(particleCount * 3);
        var colors = new Float32Array(particleCount * 3);
        var sizes = new Float32Array(particleCount);
        var transparencies = new Float32Array(particleCount);
        var texIndex = new Float32Array(particleCount);
        var velocities = [];

        // set particles start
        var vertex = new THREE.Vector3();
        var velocity = new THREE.Vector3();
        var color = new THREE.Color(standardColor);
        var i;
        for (i = 0; i < particleCount; i++) {
            if (startPosition) {
                startPosition(vertex, i);
            }
            vertex.toArray(positions, i * 3);

            if (startColor) {
                startColor(color, i);
            }
            color.toArray(colors, i * 3);

            sizes[i] = startSize(i);
            transparencies[i] = startAlpha(i);
            texIndex[i] = startTexture(i);

            if (startVelocity) {
                startVelocity(velocity, i);
            }
            velocity.toArray(velocities, i * 3);
        }

        var pGeometry = new THREE.BufferGeometry();
        pGeometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
        pGeometry.addAttribute('customColor', new THREE.BufferAttribute(colors, 3));
        pGeometry.addAttribute('size', new THREE.BufferAttribute(sizes, 1));
        pGeometry.addAttribute('alpha', new THREE.BufferAttribute(transparencies, 1));
        pGeometry.addAttribute('texIndex', new THREE.BufferAttribute(texIndex, 1));

        var pMaterial = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: String(vertexShader),
            fragmentShader: String(fragmentShader),
            blending: THREE.NormalBlending,
            /* the particles don't get sorted, they've removed this functionality from ThreeJs R70 onwards so we set depthWrite to false to prevent weird alpha artifacts
             * We need to try sorting this ourself in the future: https://github.com/mrdoob/three.js/blob/dev/examples/webgl_custom_attributes_points2.html
             * EDIT: added sorting function from github page, seems to not be optimized very well so commented it out for now
             */
            // depthTest: false,
            depthWrite: false,
            transparent: true,
            alphaTest: 0.2,
        });

        var addVelocities = function (data) {
            var p = pGeometry.attributes.position;
            var length = activeParticles * 3;
            for (i = 0; i < length; i++) {
                p.array[i] += velocities[i] * data.speed;
            }
            p.needsUpdate = true;
        };

        // create the particle system
        var particleSystem = new THREE.Points(pGeometry, pMaterial);

        var component = {
            name: 'particleSystemPlus',
            particles: particleSystem,
            active: true,
            addVelocitiesAutomatically: true,
            start: function (data) {
                Onigiri.scene.add(particleSystem);
                if (settings.start) {
                    (settings.start.bind(this))(data);
                }
            },
            destroy: function (data) {
                // dangerous to dispose of geometry, will eventually crash webgl?
                // solution for now is to keep one instance of Three and only use that so we can dispose of the geometry safely
                pGeometry.dispose();
                pMaterial.dispose();
                Onigiri.scene.remove(particleSystem);
            },
            update: function (data) {
                var particleData = {
                    speed: data.speed,
                    amount: activeParticles,
                    attributes: pGeometry.attributes,
                    velocities: velocities,
                    positionDirty: false,
                    colorDirty: false,
                    sizeDirty: false,
                    alphaDirty: false,
                    texIndexDirty: false,
                    material: pMaterial,
                };
                if (settings.update) {
                    (settings.update.bind(this))(particleData);
                }

                if (this.addVelocitiesAutomatically) {
                    addVelocities(data);
                } else {
                    pGeometry.attributes.position.needsUpdate = particleData.positionDirty;
                }
                pGeometry.attributes.customColor.needsUpdate = particleData.colorDirty;
                pGeometry.attributes.size.needsUpdate = particleData.sizeDirty;
                pGeometry.attributes.alpha.needsUpdate = particleData.alphaDirty;
                pGeometry.attributes.texIndex.needsUpdate = particleData.texIndexDirty;
            },
            attached: settings.attached,
            get activeParticles() {
                return activeParticles;
            },
            set activeParticles(v) {
                if (v === activeParticles) {
                    return;
                }
                if (v > particleCount) {
                    v = particleCount;
                }
                particleSystem.geometry.setDrawRange(0, v);
                activeParticles = v;
            }
        };
        return component;
    };
    ParticleSystem.addToOnigiri = function () {
        Onigiri.ParticleSystem = ParticleSystem;
        console.log("Onigiri: added Onigiri.ParticleSystem");
    };
    return ParticleSystem;
});