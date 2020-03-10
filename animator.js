/**
 * Helper module for animations, helps blending between animations.
 * More notes about this module: https://gist.github.com/exelotl/d28c3d2949f572e54ee5e7272e9f0cc9
 * @moduleName Animator
 * @snippet Animator()|Constructor
    Animator({
        object3D: ${1},
        defaultAnimation: '${2}'
    })
 */
bento.define('onigiri/animator', [
    'bento/utils',
    'onigiri/onigiri'
], function (
    Utils,
    Onigiri
) {
    'use strict';
    var Animator = function (settings) {
        // --- Parameters ---
        var targetObject3D = settings.object3D;
        var defaultAnimation = settings.defaultAnimation;

        // --- Variables ---
        var mixer;
        var currentClip = null;
        var currentAction = null;
        var currentAnimation = '';
        var currentSpeed = 1;

        var queue = [];
        var queueTimeout = 0;

        var animations = {};
        // var onCurrentAnimationComplete = null;   // TODO: use mixer.addEventListener to fire this?

        // --- Functions ---
        var processAnimations = function () {
            Utils.forEach(targetObject3D.animations, function (animation, i) {
                var lastIndex = animation.name.lastIndexOf('|') + 1;
                var animationName = animation.name.substring(lastIndex);
                if (!animationName) {
                    return;
                }
                if (!animation[animationName]) {
                    animations[animationName] = targetObject3D.animations[i];
                }
            });
        };

        var setCurrentTime = function (timeInSeconds) {
            if (!mixer) {
                return;
            }
            mixer.time = 0; // Zero out time attribute for AnimationMixer object;
            for (var i = 0; i < mixer._actions.length; i++) {
                mixer._actions[i].time = 0; // Zero out time attribute for all associated AnimationAction objects.
            }
            return mixer.update(timeInSeconds); // Update used to set exact time. Returns "this" AnimationMixer object.
        };

        var queueAnimation = function (animationName, options) {
            var clip = animations[animationName];
            if (clip) {
                var delay = options.delay;
                var clipDelay = options.clipDelay;
                if (delay) {
                    // immediately start the timer if nothing else is queued
                    if (queue.length === 0) {
                        queueTimeout = delay * 60;
                    }
                }
                if (!clipDelay && !delay) {
                    clipDelay = Math.max(0, clip.duration - (options.fadeTime || 0));
                }
                queue.push({
                    name: animationName,
                    delay: delay,
                    clipDelay: clipDelay,
                    options: options,
                });
            } else {
                Utils.log(`Onigiri.Animator: Attempt to queue unknown animation '${animationName}'`);
            }
        };

        var setAnimation = function (animationName, options, preserveQueue) {
            // console.log('Set animation: ' + animationName);
            if (!mixer) {
                return;
            }
            if (!preserveQueue) {
                queue.length = 0;
            }
            options = options || {};

            var loop = Utils.getDefault(options.loop, false);
            var fadeTime = Utils.getDefault(options.fadeTime, 0.0);
            var forceRestart = Utils.getDefault(options.forceRestart, false);
            var speed = Utils.getDefault(options.speed, 1.0);

            var clip = animations[animationName];
            if (clip) {

                currentClip = clip;

                if (fadeTime > 0) {
                    var nextAction = mixer.clipAction(clip);
                    if (currentAnimation !== animationName || forceRestart) {
                        nextAction.reset();
                        currentAction.crossFadeTo(nextAction, fadeTime, true);
                    }
                    currentAction = nextAction;
                } else {

                    currentAction = mixer.clipAction(clip);

                    // reset if necessary
                    if (currentAnimation !== animationName || forceRestart) {
                        mixer.stopAllAction();
                        setCurrentTime(0);
                        currentAction.weight = 1;
                    }
                }
                currentSpeed = speed;
                currentAnimation = animationName;
                currentAction.clampWhenFinished = true;
                currentAction.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
                currentAction.play();

                // //set callback
                // if (options.onComplete) {
                //     onCurrentAnimationComplete = options.onComplete;
                // } else {
                //     onCurrentAnimationComplete = null;
                // }

            } else {
                Utils.log(`Onigiri.Animator: Attempt to play unknown animation '${animationName}'`);
            }
        };
        var stopAnimation = function () {
            mixer.stopAllAction();
        };

        // --- Component ---
        var animatorComponent = {
            name: 'animatorComponent',
            start: function (data) {
                // find the relevant object3D if it doesn't exist
                if (!targetObject3D) {
                    targetObject3D = this.parent.object3D;
                }
                if (targetObject3D.animations) {
                    //make a new animation mixer
                    mixer = new THREE.AnimationMixer(targetObject3D);
                    //create a list of animations
                    processAnimations();
                    //play default animation if we have one
                    if (defaultAnimation && this.hasAnimation(defaultAnimation)) {
                        setAnimation(defaultAnimation, {
                            loop: true
                        });
                    }
                } else {
                    Utils.log('Onigiri.Animator: No animations on Object3D!');
                }
            },
            destroy: function (data) {
                mixer.stopAllAction();
            },
            update: function (data) {
                if (!mixer) {
                    return;
                }

                // update the animation
                mixer.update((1 / 60) * currentSpeed * data.speed);


                if (queue.length > 0) {
                    var head = queue[0];
                    var changeAnim = false;

                    if (queueTimeout > 0) {
                        // change when a fixed time is up
                        queueTimeout -= data.speed;
                        if (queueTimeout <= 0) {
                            queueTimeout = 0;
                            changeAnim = true;
                        }
                    } else if (currentAction.time >= head.clipDelay) {
                        // change because we reached a timestamp.
                        changeAnim = true;
                        // Note: what if clipDelay is very close to clip.duration?
                        // We might need additional logic to make sure we didn't miss the end during the wraparound.
                    }

                    if (changeAnim) {
                        queue.shift();
                        setAnimation(head.name, head.options, true);

                        if (queue.length > 0) {
                            var nextHead = queue[0];
                            if (nextHead.delay) {
                                queueTimeout = nextHead.delay * 60;
                            }
                        }
                    }
                }
            },
            /**
             * @snippet #Animator.hasAnimation()|Boolean
            hasAnimation('$1')
             */
            hasAnimation: function (animation) {
                return Utils.isDefined(animations[animation]);
            },
            /**
             * @snippet #Animator.getAnimations()|Array
            getAnimations()
             */
            getAnimations: function () {
                return animations;
            },
            /**
             * @snippet #Animator.setCurrentSpeed()|Snippet
            setCurrentSpeed(${1:0})
             */
            setCurrentSpeed: function (newSpeed) {
                currentSpeed = newSpeed;
            },
            /**
             * @snippet #Animator.getCurrentTime()|Number
            getCurrentTime()
             */
            getCurrentTime: function () {
                return currentAction.time;
            },
            /**
             * @snippet #Animator.setCurrentTime()|Snippet
            setCurrentTime(${1:timeInSeconds})
             */
            setCurrentTime: setCurrentTime,
            /**
             * @snippet #Animator.play()|Snippet
            play(${1:0})
             */
            play: setAnimation,
            /**
             * @snippet #Animator.stop()|Snippet
            stop(${1:0})
             */
            stop: stopAnimation,
            /**
             * @snippet #Animator.queue()|Snippet
            queue(${1:0})
             */
            queue: queueAnimation,
            /**
             * @snippet #Animator.getCurrentClip()|Snippet
            getCurrentClip()
             */
            getCurrentClip: function () {
                return currentClip;
            },
            /**
             * @snippet #Animator.getCurrentClip()|THREE.AnimationClip
            getCurrentClip()
             */
            getCurrentAction: function () {
                return currentAction;
            },
            /**
             * @snippet #Animator.getCurrentAnimation()|String
            getCurrentAnimation()
             */
            getCurrentAnimation: function () {
                return currentAnimation;
            },
        };
        return animatorComponent;
    };

    Animator.addToOnigiri = function () {
        Onigiri.Animator = Animator;
        console.log('Onigiri: added Onigiri.Animator');
    };

    return Animator;
});