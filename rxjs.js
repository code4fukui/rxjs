function isFunction(e) {
  return 'function' == typeof e;
}
function createErrorClass(e) {
  const r = e((e) => {
    Error.call(e), (e.stack = new Error().stack);
  });
  return (r.prototype = Object.create(Error.prototype)), (r.prototype.constructor = r), r;
}
const UnsubscriptionError = createErrorClass(
  (e) =>
    function (r) {
      e(this),
        (this.message = r
          ? `${r.length} errors occurred during unsubscription:\n${r.map((e, r) => `${r + 1}) ${e.toString()}`).join('\n  ')}`
          : ''),
        (this.name = 'UnsubscriptionError'),
        (this.errors = r);
    }
);
function arrRemove(e, r) {
  if (e) {
    const t = e.indexOf(r);
    0 <= t && e.splice(t, 1);
  }
}
class Subscription {
  constructor(e) {
    (this.initialTeardown = e), (this.closed = !1), (this._parentage = null), (this._finalizers = null);
  }
  unsubscribe() {
    let e;
    if (!this.closed) {
      this.closed = !0;
      const { _parentage: r } = this;
      if (r)
        if (((this._parentage = null), Array.isArray(r))) for (const e of r) e.remove(this);
        else r.remove(this);
      const { initialTeardown: t } = this;
      if (isFunction(t))
        try {
          t();
        } catch (r) {
          e = r instanceof UnsubscriptionError ? r.errors : [r];
        }
      const { _finalizers: n } = this;
      if (n) {
        this._finalizers = null;
        for (const r of n)
          try {
            execFinalizer(r);
          } catch (r) {
            (e = null != e ? e : []), r instanceof UnsubscriptionError ? (e = [...e, ...r.errors]) : e.push(r);
          }
      }
      if (e) throw new UnsubscriptionError(e);
    }
  }
  add(e) {
    var r;
    if (e && e !== this)
      if (this.closed) execFinalizer(e);
      else {
        if (e instanceof Subscription) {
          if (e.closed || e._hasParent(this)) return;
          e._addParent(this);
        }
        (this._finalizers = null !== (r = this._finalizers) && void 0 !== r ? r : []).push(e);
      }
  }
  _hasParent(e) {
    const { _parentage: r } = this;
    return r === e || (Array.isArray(r) && r.includes(e));
  }
  _addParent(e) {
    const { _parentage: r } = this;
    this._parentage = Array.isArray(r) ? (r.push(e), r) : r ? [r, e] : e;
  }
  _removeParent(e) {
    const { _parentage: r } = this;
    r === e ? (this._parentage = null) : Array.isArray(r) && arrRemove(r, e);
  }
  remove(e) {
    const { _finalizers: r } = this;
    r && arrRemove(r, e), e instanceof Subscription && e._removeParent(this);
  }
}
Subscription.EMPTY = (() => {
  const e = new Subscription();
  return (e.closed = !0), e;
})();
const EMPTY_SUBSCRIPTION = Subscription.EMPTY;
function isSubscription(e) {
  return e instanceof Subscription || (e && 'closed' in e && isFunction(e.remove) && isFunction(e.add) && isFunction(e.unsubscribe));
}
function execFinalizer(e) {
  isFunction(e) ? e() : e.unsubscribe();
}
const config = {
    onUnhandledError: null,
    onStoppedNotification: null,
    Promise: void 0,
    useDeprecatedSynchronousErrorHandling: !1,
    useDeprecatedNextContext: !1,
  },
  timeoutProvider = {
    setTimeout(e, r, ...t) {
      const { delegate: n } = timeoutProvider;
      return (null == n ? void 0 : n.setTimeout) ? n.setTimeout(e, r, ...t) : setTimeout(e, r, ...t);
    },
    clearTimeout(e) {
      const { delegate: r } = timeoutProvider;
      return ((null == r ? void 0 : r.clearTimeout) || clearTimeout)(e);
    },
    delegate: void 0,
  };
function reportUnhandledError(e) {
  timeoutProvider.setTimeout(() => {
    const { onUnhandledError: r } = config;
    if (!r) throw e;
    r(e);
  });
}
function noop() {}
const COMPLETE_NOTIFICATION = createNotification('C', void 0, void 0);
function errorNotification(e) {
  return createNotification('E', void 0, e);
}
function nextNotification(e) {
  return createNotification('N', e, void 0);
}
function createNotification(e, r, t) {
  return { kind: e, value: r, error: t };
}
let context = null;
function errorContext(e) {
  if (config.useDeprecatedSynchronousErrorHandling) {
    const r = !context;
    if ((r && (context = { errorThrown: !1, error: null }), e(), r)) {
      const { errorThrown: e, error: r } = context;
      if (((context = null), e)) throw r;
    }
  } else e();
}
function captureError(e) {
  config.useDeprecatedSynchronousErrorHandling && context && ((context.errorThrown = !0), (context.error = e));
}
class Subscriber extends Subscription {
  constructor(e) {
    super(), (this.isStopped = !1), e ? ((this.destination = e), isSubscription(e) && e.add(this)) : (this.destination = EMPTY_OBSERVER);
  }
  static create(e, r, t) {
    return new SafeSubscriber(e, r, t);
  }
  next(e) {
    this.isStopped ? handleStoppedNotification(nextNotification(e), this) : this._next(e);
  }
  error(e) {
    this.isStopped ? handleStoppedNotification(errorNotification(e), this) : ((this.isStopped = !0), this._error(e));
  }
  complete() {
    this.isStopped ? handleStoppedNotification(COMPLETE_NOTIFICATION, this) : ((this.isStopped = !0), this._complete());
  }
  unsubscribe() {
    this.closed || ((this.isStopped = !0), super.unsubscribe(), (this.destination = null));
  }
  _next(e) {
    this.destination.next(e);
  }
  _error(e) {
    try {
      this.destination.error(e);
    } finally {
      this.unsubscribe();
    }
  }
  _complete() {
    try {
      this.destination.complete();
    } finally {
      this.unsubscribe();
    }
  }
}
const _bind = Function.prototype.bind;
function bind(e, r) {
  return _bind.call(e, r);
}
class ConsumerObserver {
  constructor(e) {
    this.partialObserver = e;
  }
  next(e) {
    const { partialObserver: r } = this;
    if (r.next)
      try {
        r.next(e);
      } catch (e) {
        handleUnhandledError(e);
      }
  }
  error(e) {
    const { partialObserver: r } = this;
    if (r.error)
      try {
        r.error(e);
      } catch (e) {
        handleUnhandledError(e);
      }
    else handleUnhandledError(e);
  }
  complete() {
    const { partialObserver: e } = this;
    if (e.complete)
      try {
        e.complete();
      } catch (e) {
        handleUnhandledError(e);
      }
  }
}
class SafeSubscriber extends Subscriber {
  constructor(e, r, t) {
    let n;
    if ((super(), isFunction(e) || !e))
      n = { next: null != e ? e : void 0, error: null != r ? r : void 0, complete: null != t ? t : void 0 };
    else {
      let r;
      this && config.useDeprecatedNextContext
        ? ((r = Object.create(e)),
          (r.unsubscribe = () => this.unsubscribe()),
          (n = { next: e.next && bind(e.next, r), error: e.error && bind(e.error, r), complete: e.complete && bind(e.complete, r) }))
        : (n = e);
    }
    this.destination = new ConsumerObserver(n);
  }
}
function handleUnhandledError(e) {
  config.useDeprecatedSynchronousErrorHandling ? captureError(e) : reportUnhandledError(e);
}
function defaultErrorHandler(e) {
  throw e;
}
function handleStoppedNotification(e, r) {
  const { onStoppedNotification: t } = config;
  t && timeoutProvider.setTimeout(() => t(e, r));
}
const EMPTY_OBSERVER = { closed: !0, next: noop, error: defaultErrorHandler, complete: noop },
  observable = ('function' == typeof Symbol && Symbol.observable) || '@@observable';
function identity(e) {
  return e;
}
function pipe(...e) {
  return pipeFromArray(e);
}
function pipeFromArray(e) {
  return 0 === e.length
    ? identity
    : 1 === e.length
    ? e[0]
    : function (r) {
        return e.reduce((e, r) => r(e), r);
      };
}
class Observable {
  constructor(e) {
    e && (this._subscribe = e);
  }
  lift(e) {
    const r = new Observable();
    return (r.source = this), (r.operator = e), r;
  }
  subscribe(e, r, t) {
    const n = isSubscriber(e) ? e : new SafeSubscriber(e, r, t);
    return (
      errorContext(() => {
        const { operator: e, source: r } = this;
        n.add(e ? e.call(n, r) : r ? this._subscribe(n) : this._trySubscribe(n));
      }),
      n
    );
  }
  _trySubscribe(e) {
    try {
      return this._subscribe(e);
    } catch (r) {
      e.error(r);
    }
  }
  forEach(e, r) {
    return new (r = getPromiseCtor(r))((r, t) => {
      const n = new SafeSubscriber({
        next: (r) => {
          try {
            e(r);
          } catch (e) {
            t(e), n.unsubscribe();
          }
        },
        error: t,
        complete: r,
      });
      this.subscribe(n);
    });
  }
  _subscribe(e) {
    var r;
    return null === (r = this.source) || void 0 === r ? void 0 : r.subscribe(e);
  }
  [observable]() {
    return this;
  }
  pipe(...e) {
    return pipeFromArray(e)(this);
  }
  toPromise(e) {
    return new (e = getPromiseCtor(e))((e, r) => {
      let t;
      this.subscribe(
        (e) => (t = e),
        (e) => r(e),
        () => e(t)
      );
    });
  }
}
function getPromiseCtor(e) {
  var r;
  return null !== (r = null != e ? e : config.Promise) && void 0 !== r ? r : Promise;
}
function isObserver(e) {
  return e && isFunction(e.next) && isFunction(e.error) && isFunction(e.complete);
}
function isSubscriber(e) {
  return (e && e instanceof Subscriber) || (isObserver(e) && isSubscription(e));
}
function hasLift(e) {
  return isFunction(null == e ? void 0 : e.lift);
}
function operate(e) {
  return (r) => {
    if (hasLift(r))
      return r.lift(function (r) {
        try {
          return e(r, this);
        } catch (e) {
          this.error(e);
        }
      });
    throw new TypeError('Unable to lift unknown Observable type');
  };
}
function createOperatorSubscriber(e, r, t, n, o) {
  return new OperatorSubscriber(e, r, t, n, o);
}
Observable.create = (e) => new Observable(e);
class OperatorSubscriber extends Subscriber {
  constructor(e, r, t, n, o, i) {
    super(e),
      (this.onFinalize = o),
      (this.shouldUnsubscribe = i),
      (this._next = r
        ? function (t) {
            try {
              r(t);
            } catch (r) {
              e.error(r);
            }
          }
        : super._next),
      (this._error = n
        ? function (r) {
            try {
              n(r);
            } catch (r) {
              e.error(r);
            } finally {
              this.unsubscribe();
            }
          }
        : super._error),
      (this._complete = t
        ? function () {
            try {
              t();
            } catch (r) {
              e.error(r);
            } finally {
              this.unsubscribe();
            }
          }
        : super._complete);
  }
  unsubscribe() {
    var e;
    if (!this.shouldUnsubscribe || this.shouldUnsubscribe()) {
      const { closed: r } = this;
      super.unsubscribe(), !r && (null === (e = this.onFinalize) || void 0 === e || e.call(this));
    }
  }
}
function refCount() {
  return operate((e, r) => {
    let t = null;
    e._refCount++;
    const n = createOperatorSubscriber(r, void 0, void 0, void 0, () => {
      if (!e || e._refCount <= 0 || 0 < --e._refCount) return void (t = null);
      const n = e._connection,
        o = t;
      (t = null), !n || (o && n !== o) || n.unsubscribe(), r.unsubscribe();
    });
    e.subscribe(n), n.closed || (t = e.connect());
  });
}
class ConnectableObservable extends Observable {
  constructor(e, r) {
    super(),
      (this.source = e),
      (this.subjectFactory = r),
      (this._subject = null),
      (this._refCount = 0),
      (this._connection = null),
      hasLift(e) && (this.lift = e.lift);
  }
  _subscribe(e) {
    return this.getSubject().subscribe(e);
  }
  getSubject() {
    const e = this._subject;
    return (e && !e.isStopped) || (this._subject = this.subjectFactory()), this._subject;
  }
  _teardown() {
    this._refCount = 0;
    const { _connection: e } = this;
    (this._subject = this._connection = null), null == e || e.unsubscribe();
  }
  connect() {
    let e = this._connection;
    if (!e) {
      e = this._connection = new Subscription();
      const r = this.getSubject();
      e.add(
        this.source.subscribe(
          createOperatorSubscriber(
            r,
            void 0,
            () => {
              this._teardown(), r.complete();
            },
            (e) => {
              this._teardown(), r.error(e);
            },
            () => this._teardown()
          )
        )
      ),
        e.closed && ((this._connection = null), (e = Subscription.EMPTY));
    }
    return e;
  }
  refCount() {
    return refCount()(this);
  }
}
const performanceTimestampProvider = { now: () => (performanceTimestampProvider.delegate || performance).now(), delegate: void 0 },
  animationFrameProvider = {
    schedule(e) {
      let r = requestAnimationFrame,
        t = cancelAnimationFrame;
      const { delegate: n } = animationFrameProvider;
      n && ((r = n.requestAnimationFrame), (t = n.cancelAnimationFrame));
      const o = r((r) => {
        (t = void 0), e(r);
      });
      return new Subscription(() => (null == t ? void 0 : t(o)));
    },
    requestAnimationFrame(...e) {
      const { delegate: r } = animationFrameProvider;
      return ((null == r ? void 0 : r.requestAnimationFrame) || requestAnimationFrame)(...e);
    },
    cancelAnimationFrame(...e) {
      const { delegate: r } = animationFrameProvider;
      return ((null == r ? void 0 : r.cancelAnimationFrame) || cancelAnimationFrame)(...e);
    },
    delegate: void 0,
  };
function animationFrames(e) {
  return e ? animationFramesFactory(e) : DEFAULT_ANIMATION_FRAMES;
}
function animationFramesFactory(e) {
  return new Observable((r) => {
    const t = e || performanceTimestampProvider,
      n = t.now();
    let o = 0;
    const i = () => {
      r.closed ||
        (o = animationFrameProvider.requestAnimationFrame((s) => {
          o = 0;
          const c = t.now();
          r.next({ timestamp: e ? c : s, elapsed: c - n }), i();
        }));
    };
    return (
      i(),
      () => {
        o && animationFrameProvider.cancelAnimationFrame(o);
      }
    );
  });
}
const DEFAULT_ANIMATION_FRAMES = animationFramesFactory(),
  ObjectUnsubscribedError = createErrorClass(
    (e) =>
      function () {
        e(this), (this.name = 'ObjectUnsubscribedError'), (this.message = 'object unsubscribed');
      }
  );
class Subject extends Observable {
  constructor() {
    super(),
      (this.closed = !1),
      (this.currentObservers = null),
      (this.observers = []),
      (this.isStopped = !1),
      (this.hasError = !1),
      (this.thrownError = null);
  }
  lift(e) {
    const r = new AnonymousSubject(this, this);
    return (r.operator = e), r;
  }
  _throwIfClosed() {
    if (this.closed) throw new ObjectUnsubscribedError();
  }
  next(e) {
    errorContext(() => {
      if ((this._throwIfClosed(), !this.isStopped)) {
        this.currentObservers || (this.currentObservers = Array.from(this.observers));
        for (const r of this.currentObservers) r.next(e);
      }
    });
  }
  error(e) {
    errorContext(() => {
      if ((this._throwIfClosed(), !this.isStopped)) {
        (this.hasError = this.isStopped = !0), (this.thrownError = e);
        const { observers: r } = this;
        for (; r.length; ) r.shift().error(e);
      }
    });
  }
  complete() {
    errorContext(() => {
      if ((this._throwIfClosed(), !this.isStopped)) {
        this.isStopped = !0;
        const { observers: e } = this;
        for (; e.length; ) e.shift().complete();
      }
    });
  }
  unsubscribe() {
    (this.isStopped = this.closed = !0), (this.observers = this.currentObservers = null);
  }
  get observed() {
    var e;
    return (null === (e = this.observers) || void 0 === e ? void 0 : e.length) > 0;
  }
  _trySubscribe(e) {
    return this._throwIfClosed(), super._trySubscribe(e);
  }
  _subscribe(e) {
    return this._throwIfClosed(), this._checkFinalizedStatuses(e), this._innerSubscribe(e);
  }
  _innerSubscribe(e) {
    const { hasError: r, isStopped: t, observers: n } = this;
    return r || t
      ? EMPTY_SUBSCRIPTION
      : ((this.currentObservers = null),
        n.push(e),
        new Subscription(() => {
          (this.currentObservers = null), arrRemove(n, e);
        }));
  }
  _checkFinalizedStatuses(e) {
    const { hasError: r, thrownError: t, isStopped: n } = this;
    r ? e.error(t) : n && e.complete();
  }
  asObservable() {
    const e = new Observable();
    return (e.source = this), e;
  }
}
Subject.create = (e, r) => new AnonymousSubject(e, r);
class AnonymousSubject extends Subject {
  constructor(e, r) {
    super(), (this.destination = e), (this.source = r);
  }
  next(e) {
    var r, t;
    null === (t = null === (r = this.destination) || void 0 === r ? void 0 : r.next) || void 0 === t || t.call(r, e);
  }
  error(e) {
    var r, t;
    null === (t = null === (r = this.destination) || void 0 === r ? void 0 : r.error) || void 0 === t || t.call(r, e);
  }
  complete() {
    var e, r;
    null === (r = null === (e = this.destination) || void 0 === e ? void 0 : e.complete) || void 0 === r || r.call(e);
  }
  _subscribe(e) {
    var r, t;
    return null !== (t = null === (r = this.source) || void 0 === r ? void 0 : r.subscribe(e)) && void 0 !== t ? t : EMPTY_SUBSCRIPTION;
  }
}
class BehaviorSubject extends Subject {
  constructor(e) {
    super(), (this._value = e);
  }
  get value() {
    return this.getValue();
  }
  _subscribe(e) {
    const r = super._subscribe(e);
    return !r.closed && e.next(this._value), r;
  }
  getValue() {
    const { hasError: e, thrownError: r, _value: t } = this;
    if (e) throw r;
    return this._throwIfClosed(), t;
  }
  next(e) {
    super.next((this._value = e));
  }
}
const dateTimestampProvider = { now: () => (dateTimestampProvider.delegate || Date).now(), delegate: void 0 };
class ReplaySubject extends Subject {
  constructor(e = 1 / 0, r = 1 / 0, t = dateTimestampProvider) {
    super(),
      (this._bufferSize = e),
      (this._windowTime = r),
      (this._timestampProvider = t),
      (this._buffer = []),
      (this._infiniteTimeWindow = !0),
      (this._infiniteTimeWindow = r === 1 / 0),
      (this._bufferSize = Math.max(1, e)),
      (this._windowTime = Math.max(1, r));
  }
  next(e) {
    const { isStopped: r, _buffer: t, _infiniteTimeWindow: n, _timestampProvider: o, _windowTime: i } = this;
    r || (t.push(e), !n && t.push(o.now() + i)), this._trimBuffer(), super.next(e);
  }
  _subscribe(e) {
    this._throwIfClosed(), this._trimBuffer();
    const r = this._innerSubscribe(e),
      { _infiniteTimeWindow: t, _buffer: n } = this,
      o = n.slice();
    for (let r = 0; r < o.length && !e.closed; r += t ? 1 : 2) e.next(o[r]);
    return this._checkFinalizedStatuses(e), r;
  }
  _trimBuffer() {
    const { _bufferSize: e, _timestampProvider: r, _buffer: t, _infiniteTimeWindow: n } = this,
      o = (n ? 1 : 2) * e;
    if ((e < 1 / 0 && o < t.length && t.splice(0, t.length - o), !n)) {
      const e = r.now();
      let n = 0;
      for (let r = 1; r < t.length && t[r] <= e; r += 2) n = r;
      n && t.splice(0, n + 1);
    }
  }
}
class AsyncSubject extends Subject {
  constructor() {
    super(...arguments), (this._value = null), (this._hasValue = !1), (this._isComplete = !1);
  }
  _checkFinalizedStatuses(e) {
    const { hasError: r, _hasValue: t, _value: n, thrownError: o, isStopped: i, _isComplete: s } = this;
    r ? e.error(o) : (i || s) && (t && e.next(n), e.complete());
  }
  next(e) {
    this.isStopped || ((this._value = e), (this._hasValue = !0));
  }
  complete() {
    const { _hasValue: e, _value: r, _isComplete: t } = this;
    t || ((this._isComplete = !0), e && super.next(r), super.complete());
  }
}
class Action extends Subscription {
  constructor(e, r) {
    super();
  }
  schedule(e, r = 0) {
    return this;
  }
}
const intervalProvider = {
  setInterval(e, r, ...t) {
    const { delegate: n } = intervalProvider;
    return (null == n ? void 0 : n.setInterval) ? n.setInterval(e, r, ...t) : setInterval(e, r, ...t);
  },
  clearInterval(e) {
    const { delegate: r } = intervalProvider;
    return ((null == r ? void 0 : r.clearInterval) || clearInterval)(e);
  },
  delegate: void 0,
};
class AsyncAction extends Action {
  constructor(e, r) {
    super(e, r), (this.scheduler = e), (this.work = r), (this.pending = !1);
  }
  schedule(e, r = 0) {
    var t;
    if (this.closed) return this;
    this.state = e;
    const n = this.id,
      o = this.scheduler;
    return (
      null != n && (this.id = this.recycleAsyncId(o, n, r)),
      (this.pending = !0),
      (this.delay = r),
      (this.id = null !== (t = this.id) && void 0 !== t ? t : this.requestAsyncId(o, this.id, r)),
      this
    );
  }
  requestAsyncId(e, r, t = 0) {
    return intervalProvider.setInterval(e.flush.bind(e, this), t);
  }
  recycleAsyncId(e, r, t = 0) {
    if (null != t && this.delay === t && !1 === this.pending) return r;
    null != r && intervalProvider.clearInterval(r);
  }
  execute(e, r) {
    if (this.closed) return new Error('executing a cancelled action');
    this.pending = !1;
    const t = this._execute(e, r);
    if (t) return t;
    !1 === this.pending && null != this.id && (this.id = this.recycleAsyncId(this.scheduler, this.id, null));
  }
  _execute(e, r) {
    let t,
      n = !1;
    try {
      this.work(e);
    } catch (e) {
      (n = !0), (t = e || new Error('Scheduled action threw falsy error'));
    }
    if (n) return this.unsubscribe(), t;
  }
  unsubscribe() {
    if (!this.closed) {
      const { id: e, scheduler: r } = this,
        { actions: t } = r;
      (this.work = this.state = this.scheduler = null),
        (this.pending = !1),
        arrRemove(t, this),
        null != e && (this.id = this.recycleAsyncId(r, e, null)),
        (this.delay = null),
        super.unsubscribe();
    }
  }
}
let resolved,
  nextHandle = 1;
const activeHandles = {};
function findAndClearHandle(e) {
  return e in activeHandles && (delete activeHandles[e], !0);
}
const Immediate = {
    setImmediate(e) {
      const r = nextHandle++;
      return (activeHandles[r] = !0), resolved || (resolved = Promise.resolve()), resolved.then(() => findAndClearHandle(r) && e()), r;
    },
    clearImmediate(e) {
      findAndClearHandle(e);
    },
  },
  { setImmediate: setImmediate, clearImmediate: clearImmediate } = Immediate,
  immediateProvider = {
    setImmediate(...e) {
      const { delegate: r } = immediateProvider;
      return ((null == r ? void 0 : r.setImmediate) || setImmediate)(...e);
    },
    clearImmediate(e) {
      const { delegate: r } = immediateProvider;
      return ((null == r ? void 0 : r.clearImmediate) || clearImmediate)(e);
    },
    delegate: void 0,
  };
class AsapAction extends AsyncAction {
  constructor(e, r) {
    super(e, r), (this.scheduler = e), (this.work = r);
  }
  requestAsyncId(e, r, t = 0) {
    return null !== t && t > 0
      ? super.requestAsyncId(e, r, t)
      : (e.actions.push(this), e._scheduled || (e._scheduled = immediateProvider.setImmediate(e.flush.bind(e, void 0))));
  }
  recycleAsyncId(e, r, t = 0) {
    var n;
    if (null != t ? t > 0 : this.delay > 0) return super.recycleAsyncId(e, r, t);
    const { actions: o } = e;
    null != r &&
      (null === (n = o[o.length - 1]) || void 0 === n ? void 0 : n.id) !== r &&
      (immediateProvider.clearImmediate(r), (e._scheduled = void 0));
  }
}
class Scheduler {
  constructor(e, r = Scheduler.now) {
    (this.schedulerActionCtor = e), (this.now = r);
  }
  schedule(e, r = 0, t) {
    return new this.schedulerActionCtor(this, e).schedule(t, r);
  }
}
Scheduler.now = dateTimestampProvider.now;
class AsyncScheduler extends Scheduler {
  constructor(e, r = Scheduler.now) {
    super(e, r), (this.actions = []), (this._active = !1);
  }
  flush(e) {
    const { actions: r } = this;
    if (this._active) return void r.push(e);
    let t;
    this._active = !0;
    do {
      if ((t = e.execute(e.state, e.delay))) break;
    } while ((e = r.shift()));
    if (((this._active = !1), t)) {
      for (; (e = r.shift()); ) e.unsubscribe();
      throw t;
    }
  }
}
class AsapScheduler extends AsyncScheduler {
  flush(e) {
    this._active = !0;
    const r = this._scheduled;
    this._scheduled = void 0;
    const { actions: t } = this;
    let n;
    e = e || t.shift();
    do {
      if ((n = e.execute(e.state, e.delay))) break;
    } while ((e = t[0]) && e.id === r && t.shift());
    if (((this._active = !1), n)) {
      for (; (e = t[0]) && e.id === r && t.shift(); ) e.unsubscribe();
      throw n;
    }
  }
}
const asapScheduler = new AsapScheduler(AsapAction),
  asap = asapScheduler,
  asyncScheduler = new AsyncScheduler(AsyncAction),
  async = asyncScheduler;
class QueueAction extends AsyncAction {
  constructor(e, r) {
    super(e, r), (this.scheduler = e), (this.work = r);
  }
  schedule(e, r = 0) {
    return r > 0 ? super.schedule(e, r) : ((this.delay = r), (this.state = e), this.scheduler.flush(this), this);
  }
  execute(e, r) {
    return r > 0 || this.closed ? super.execute(e, r) : this._execute(e, r);
  }
  requestAsyncId(e, r, t = 0) {
    return (null != t && t > 0) || (null == t && this.delay > 0) ? super.requestAsyncId(e, r, t) : (e.flush(this), 0);
  }
}
class QueueScheduler extends AsyncScheduler {}
const queueScheduler = new QueueScheduler(QueueAction),
  queue = queueScheduler;
class AnimationFrameAction extends AsyncAction {
  constructor(e, r) {
    super(e, r), (this.scheduler = e), (this.work = r);
  }
  requestAsyncId(e, r, t = 0) {
    return null !== t && t > 0
      ? super.requestAsyncId(e, r, t)
      : (e.actions.push(this), e._scheduled || (e._scheduled = animationFrameProvider.requestAnimationFrame(() => e.flush(void 0))));
  }
  recycleAsyncId(e, r, t = 0) {
    var n;
    if (null != t ? t > 0 : this.delay > 0) return super.recycleAsyncId(e, r, t);
    const { actions: o } = e;
    null != r &&
      (null === (n = o[o.length - 1]) || void 0 === n ? void 0 : n.id) !== r &&
      (animationFrameProvider.cancelAnimationFrame(r), (e._scheduled = void 0));
  }
}
class AnimationFrameScheduler extends AsyncScheduler {
  flush(e) {
    this._active = !0;
    const r = this._scheduled;
    this._scheduled = void 0;
    const { actions: t } = this;
    let n;
    e = e || t.shift();
    do {
      if ((n = e.execute(e.state, e.delay))) break;
    } while ((e = t[0]) && e.id === r && t.shift());
    if (((this._active = !1), n)) {
      for (; (e = t[0]) && e.id === r && t.shift(); ) e.unsubscribe();
      throw n;
    }
  }
}
const animationFrameScheduler = new AnimationFrameScheduler(AnimationFrameAction),
  animationFrame = animationFrameScheduler;
class VirtualTimeScheduler extends AsyncScheduler {
  constructor(e = VirtualAction, r = 1 / 0) {
    super(e, () => this.frame), (this.maxFrames = r), (this.frame = 0), (this.index = -1);
  }
  flush() {
    const { actions: e, maxFrames: r } = this;
    let t, n;
    for (; (n = e[0]) && n.delay <= r && (e.shift(), (this.frame = n.delay), !(t = n.execute(n.state, n.delay))); );
    if (t) {
      for (; (n = e.shift()); ) n.unsubscribe();
      throw t;
    }
  }
}
VirtualTimeScheduler.frameTimeFactor = 10;
class VirtualAction extends AsyncAction {
  constructor(e, r, t = (e.index += 1)) {
    super(e, r), (this.scheduler = e), (this.work = r), (this.index = t), (this.active = !0), (this.index = e.index = t);
  }
  schedule(e, r = 0) {
    if (Number.isFinite(r)) {
      if (!this.id) return super.schedule(e, r);
      this.active = !1;
      const t = new VirtualAction(this.scheduler, this.work);
      return this.add(t), t.schedule(e, r);
    }
    return Subscription.EMPTY;
  }
  requestAsyncId(e, r, t = 0) {
    this.delay = e.frame + t;
    const { actions: n } = e;
    return n.push(this), n.sort(VirtualAction.sortActions), 1;
  }
  recycleAsyncId(e, r, t = 0) {}
  _execute(e, r) {
    if (!0 === this.active) return super._execute(e, r);
  }
  static sortActions(e, r) {
    return e.delay === r.delay ? (e.index === r.index ? 0 : e.index > r.index ? 1 : -1) : e.delay > r.delay ? 1 : -1;
  }
}
const EMPTY = new Observable((e) => e.complete());
function empty(e) {
  return e ? emptyScheduled(e) : EMPTY;
}
function emptyScheduled(e) {
  return new Observable((r) => e.schedule(() => r.complete()));
}
function isScheduler(e) {
  return e && isFunction(e.schedule);
}
function last(e) {
  return e[e.length - 1];
}
function popResultSelector(e) {
  return isFunction(last(e)) ? e.pop() : void 0;
}
function popScheduler(e) {
  return isScheduler(last(e)) ? e.pop() : void 0;
}
function popNumber(e, r) {
  return 'number' == typeof last(e) ? e.pop() : r;
}
var extendStatics = function (e, r) {
    return (
      (extendStatics =
        Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array &&
          function (e, r) {
            e.__proto__ = r;
          }) ||
        function (e, r) {
          for (var t in r) Object.prototype.hasOwnProperty.call(r, t) && (e[t] = r[t]);
        }),
      extendStatics(e, r)
    );
  },
  __assign = function () {
    return (
      (__assign =
        Object.assign ||
        function (e) {
          for (var r, t = 1, n = arguments.length; t < n; t++)
            for (var o in (r = arguments[t])) Object.prototype.hasOwnProperty.call(r, o) && (e[o] = r[o]);
          return e;
        }),
      __assign.apply(this, arguments)
    );
  };
function __awaiter(e, r, t, n) {
  return new (t || (t = Promise))(function (o, i) {
    function s(e) {
      try {
        u(n.next(e));
      } catch (e) {
        i(e);
      }
    }
    function c(e) {
      try {
        u(n.throw(e));
      } catch (e) {
        i(e);
      }
    }
    function u(e) {
      var r;
      e.done
        ? o(e.value)
        : ((r = e.value),
          r instanceof t
            ? r
            : new t(function (e) {
                e(r);
              })).then(s, c);
    }
    u((n = n.apply(e, r || [])).next());
  });
}
function __values(e) {
  var r = 'function' == typeof Symbol && Symbol.iterator,
    t = r && e[r],
    n = 0;
  if (t) return t.call(e);
  if (e && 'number' == typeof e.length)
    return {
      next: function () {
        return e && n >= e.length && (e = void 0), { value: e && e[n++], done: !e };
      },
    };
  throw new TypeError(r ? 'Object is not iterable.' : 'Symbol.iterator is not defined.');
}
function __await(e) {
  return this instanceof __await ? ((this.v = e), this) : new __await(e);
}
function __asyncGenerator(e, r, t) {
  if (!Symbol.asyncIterator) throw new TypeError('Symbol.asyncIterator is not defined.');
  var n,
    o = t.apply(e, r || []),
    i = [];
  return (
    (n = {}),
    s('next'),
    s('throw'),
    s('return'),
    (n[Symbol.asyncIterator] = function () {
      return this;
    }),
    n
  );
  function s(e) {
    o[e] &&
      (n[e] = function (r) {
        return new Promise(function (t, n) {
          i.push([e, r, t, n]) > 1 || c(e, r);
        });
      });
  }
  function c(e, r) {
    try {
      (t = o[e](r)).value instanceof __await ? Promise.resolve(t.value.v).then(u, a) : l(i[0][2], t);
    } catch (e) {
      l(i[0][3], e);
    }
    var t;
  }
  function u(e) {
    c('next', e);
  }
  function a(e) {
    c('throw', e);
  }
  function l(e, r) {
    e(r), i.shift(), i.length && c(i[0][0], i[0][1]);
  }
}
function __asyncValues(e) {
  if (!Symbol.asyncIterator) throw new TypeError('Symbol.asyncIterator is not defined.');
  var r,
    t = e[Symbol.asyncIterator];
  return t
    ? t.call(e)
    : ((e = 'function' == typeof __values ? __values(e) : e[Symbol.iterator]()),
      (r = {}),
      n('next'),
      n('throw'),
      n('return'),
      (r[Symbol.asyncIterator] = function () {
        return this;
      }),
      r);
  function n(t) {
    r[t] =
      e[t] &&
      function (r) {
        return new Promise(function (n, o) {
          (function (e, r, t, n) {
            Promise.resolve(n).then(function (r) {
              e({ value: r, done: t });
            }, r);
          })(n, o, (r = e[t](r)).done, r.value);
        });
      };
  }
}
Object.create, Object.create;
const isArrayLike = (e) => e && 'number' == typeof e.length && 'function' != typeof e;
function isPromise(e) {
  return isFunction(null == e ? void 0 : e.then);
}
function isInteropObservable(e) {
  return isFunction(e[observable]);
}
function isAsyncIterable(e) {
  return Symbol.asyncIterator && isFunction(null == e ? void 0 : e[Symbol.asyncIterator]);
}
function createInvalidObservableTypeError(e) {
  return new TypeError(
    `You provided ${
      null !== e && 'object' == typeof e ? 'an invalid object' : `'${e}'`
    } where a stream was expected. You can provide an Observable, Promise, ReadableStream, Array, AsyncIterable, or Iterable.`
  );
}
function getSymbolIterator() {
  return 'function' == typeof Symbol && Symbol.iterator ? Symbol.iterator : '@@iterator';
}
const iterator = getSymbolIterator();
function isIterable(e) {
  return isFunction(null == e ? void 0 : e[iterator]);
}
function readableStreamLikeToAsyncGenerator(e) {
  return __asyncGenerator(this, arguments, function* () {
    const r = e.getReader();
    try {
      for (;;) {
        const { value: e, done: t } = yield __await(r.read());
        if (t) return yield __await(void 0);
        yield yield __await(e);
      }
    } finally {
      r.releaseLock();
    }
  });
}
function isReadableStreamLike(e) {
  return isFunction(null == e ? void 0 : e.getReader);
}
function innerFrom(e) {
  if (e instanceof Observable) return e;
  if (null != e) {
    if (isInteropObservable(e)) return fromInteropObservable(e);
    if (isArrayLike(e)) return fromArrayLike(e);
    if (isPromise(e)) return fromPromise(e);
    if (isAsyncIterable(e)) return fromAsyncIterable(e);
    if (isIterable(e)) return fromIterable(e);
    if (isReadableStreamLike(e)) return fromReadableStreamLike(e);
  }
  throw createInvalidObservableTypeError(e);
}
function fromInteropObservable(e) {
  return new Observable((r) => {
    const t = e[observable]();
    if (isFunction(t.subscribe)) return t.subscribe(r);
    throw new TypeError('Provided object does not correctly implement Symbol.observable');
  });
}
function fromArrayLike(e) {
  return new Observable((r) => {
    for (let t = 0; t < e.length && !r.closed; t++) r.next(e[t]);
    r.complete();
  });
}
function fromPromise(e) {
  return new Observable((r) => {
    e.then(
      (e) => {
        r.closed || (r.next(e), r.complete());
      },
      (e) => r.error(e)
    ).then(null, reportUnhandledError);
  });
}
function fromIterable(e) {
  return new Observable((r) => {
    for (const t of e) if ((r.next(t), r.closed)) return;
    r.complete();
  });
}
function fromAsyncIterable(e) {
  return new Observable((r) => {
    process(e, r).catch((e) => r.error(e));
  });
}
function fromReadableStreamLike(e) {
  return fromAsyncIterable(readableStreamLikeToAsyncGenerator(e));
}
function process(e, r) {
  var t, n, o, i;
  return __awaiter(this, void 0, void 0, function* () {
    try {
      for (t = __asyncValues(e); !(n = yield t.next()).done; ) {
        const e = n.value;
        if ((r.next(e), r.closed)) return;
      }
    } catch (e) {
      o = { error: e };
    } finally {
      try {
        n && !n.done && (i = t.return) && (yield i.call(t));
      } finally {
        if (o) throw o.error;
      }
    }
    r.complete();
  });
}
function executeSchedule(e, r, t, n = 0, o = !1) {
  const i = r.schedule(function () {
    t(), o ? e.add(this.schedule(null, n)) : this.unsubscribe();
  }, n);
  if ((e.add(i), !o)) return i;
}
function observeOn(e, r = 0) {
  return operate((t, n) => {
    t.subscribe(
      createOperatorSubscriber(
        n,
        (t) => executeSchedule(n, e, () => n.next(t), r),
        () => executeSchedule(n, e, () => n.complete(), r),
        (t) => executeSchedule(n, e, () => n.error(t), r)
      )
    );
  });
}
function subscribeOn(e, r = 0) {
  return operate((t, n) => {
    n.add(e.schedule(() => t.subscribe(n), r));
  });
}
function scheduleObservable(e, r) {
  return innerFrom(e).pipe(subscribeOn(r), observeOn(r));
}
function schedulePromise(e, r) {
  return innerFrom(e).pipe(subscribeOn(r), observeOn(r));
}
function scheduleArray(e, r) {
  return new Observable((t) => {
    let n = 0;
    return r.schedule(function () {
      n === e.length ? t.complete() : (t.next(e[n++]), t.closed || this.schedule());
    });
  });
}
function scheduleIterable(e, r) {
  return new Observable((t) => {
    let n;
    return (
      executeSchedule(t, r, () => {
        (n = e[iterator]()),
          executeSchedule(
            t,
            r,
            () => {
              let e, r;
              try {
                ({ value: e, done: r } = n.next());
              } catch (e) {
                return void t.error(e);
              }
              r ? t.complete() : t.next(e);
            },
            0,
            !0
          );
      }),
      () => isFunction(null == n ? void 0 : n.return) && n.return()
    );
  });
}
function scheduleAsyncIterable(e, r) {
  if (!e) throw new Error('Iterable cannot be null');
  return new Observable((t) => {
    executeSchedule(t, r, () => {
      const n = e[Symbol.asyncIterator]();
      executeSchedule(
        t,
        r,
        () => {
          n.next().then((e) => {
            e.done ? t.complete() : t.next(e.value);
          });
        },
        0,
        !0
      );
    });
  });
}
function scheduleReadableStreamLike(e, r) {
  return scheduleAsyncIterable(readableStreamLikeToAsyncGenerator(e), r);
}
function scheduled(e, r) {
  if (null != e) {
    if (isInteropObservable(e)) return scheduleObservable(e, r);
    if (isArrayLike(e)) return scheduleArray(e, r);
    if (isPromise(e)) return schedulePromise(e, r);
    if (isAsyncIterable(e)) return scheduleAsyncIterable(e, r);
    if (isIterable(e)) return scheduleIterable(e, r);
    if (isReadableStreamLike(e)) return scheduleReadableStreamLike(e, r);
  }
  throw createInvalidObservableTypeError(e);
}
function from(e, r) {
  return r ? scheduled(e, r) : innerFrom(e);
}
function of(...e) {
  return from(e, popScheduler(e));
}
function throwError(e, r) {
  const t = isFunction(e) ? e : () => e,
    n = (e) => e.error(t());
  return new Observable(r ? (e) => r.schedule(n, 0, e) : n);
}
var NotificationKind;
!(function (e) {
  (e.NEXT = 'N'), (e.ERROR = 'E'), (e.COMPLETE = 'C');
})(NotificationKind || (NotificationKind = {}));
class Notification {
  constructor(e, r, t) {
    (this.kind = e), (this.value = r), (this.error = t), (this.hasValue = 'N' === e);
  }
  observe(e) {
    return observeNotification(this, e);
  }
  do(e, r, t) {
    const { kind: n, value: o, error: i } = this;
    return 'N' === n ? (null == e ? void 0 : e(o)) : 'E' === n ? (null == r ? void 0 : r(i)) : null == t ? void 0 : t();
  }
  accept(e, r, t) {
    var n;
    return isFunction(null === (n = e) || void 0 === n ? void 0 : n.next) ? this.observe(e) : this.do(e, r, t);
  }
  toObservable() {
    const { kind: e, value: r, error: t } = this,
      n = 'N' === e ? of(r) : 'E' === e ? throwError(() => t) : 'C' === e ? EMPTY : 0;
    if (!n) throw new TypeError(`Unexpected notification kind ${e}`);
    return n;
  }
  static createNext(e) {
    return new Notification('N', e);
  }
  static createError(e) {
    return new Notification('E', void 0, e);
  }
  static createComplete() {
    return Notification.completeNotification;
  }
}
function observeNotification(e, r) {
  var t, n, o;
  const { kind: i, value: s, error: c } = e;
  if ('string' != typeof i) throw new TypeError('Invalid notification, missing "kind"');
  'N' === i
    ? null === (t = r.next) || void 0 === t || t.call(r, s)
    : 'E' === i
    ? null === (n = r.error) || void 0 === n || n.call(r, c)
    : null === (o = r.complete) || void 0 === o || o.call(r);
}
function isObservable(e) {
  return !!e && (e instanceof Observable || (isFunction(e.lift) && isFunction(e.subscribe)));
}
Notification.completeNotification = new Notification('C');
const EmptyError = createErrorClass(
  (e) =>
    function () {
      e(this), (this.name = 'EmptyError'), (this.message = 'no elements in sequence');
    }
);
function lastValueFrom(e, r) {
  const t = 'object' == typeof r;
  return new Promise((n, o) => {
    let i,
      s = !1;
    e.subscribe({
      next: (e) => {
        (i = e), (s = !0);
      },
      error: o,
      complete: () => {
        s ? n(i) : t ? n(r.defaultValue) : o(new EmptyError());
      },
    });
  });
}
function firstValueFrom(e, r) {
  const t = 'object' == typeof r;
  return new Promise((n, o) => {
    const i = new SafeSubscriber({
      next: (e) => {
        n(e), i.unsubscribe();
      },
      error: o,
      complete: () => {
        t ? n(r.defaultValue) : o(new EmptyError());
      },
    });
    e.subscribe(i);
  });
}
const ArgumentOutOfRangeError = createErrorClass(
    (e) =>
      function () {
        e(this), (this.name = 'ArgumentOutOfRangeError'), (this.message = 'argument out of range');
      }
  ),
  NotFoundError = createErrorClass(
    (e) =>
      function (r) {
        e(this), (this.name = 'NotFoundError'), (this.message = r);
      }
  ),
  SequenceError = createErrorClass(
    (e) =>
      function (r) {
        e(this), (this.name = 'SequenceError'), (this.message = r);
      }
  );
function isValidDate(e) {
  return e instanceof Date && !isNaN(e);
}
const TimeoutError = createErrorClass(
  (e) =>
    function (r = null) {
      e(this), (this.message = 'Timeout has occurred'), (this.name = 'TimeoutError'), (this.info = r);
    }
);
function timeout(e, r) {
  const {
    first: t,
    each: n,
    with: o = timeoutErrorFactory,
    scheduler: i = null != r ? r : asyncScheduler,
    meta: s = null,
  } = isValidDate(e) ? { first: e } : 'number' == typeof e ? { each: e } : e;
  if (null == t && null == n) throw new TypeError('No timeout provided.');
  return operate((e, r) => {
    let c,
      u,
      a = null,
      l = 0;
    const b = (e) => {
      u = executeSchedule(
        r,
        i,
        () => {
          try {
            c.unsubscribe(), innerFrom(o({ meta: s, lastValue: a, seen: l })).subscribe(r);
          } catch (e) {
            r.error(e);
          }
        },
        e
      );
    };
    (c = e.subscribe(
      createOperatorSubscriber(
        r,
        (e) => {
          null == u || u.unsubscribe(), l++, r.next((a = e)), n > 0 && b(n);
        },
        void 0,
        void 0,
        () => {
          (null == u ? void 0 : u.closed) || null == u || u.unsubscribe(), (a = null);
        }
      )
    )),
      !l && b(null != t ? ('number' == typeof t ? t : +t - i.now()) : n);
  });
}
function timeoutErrorFactory(e) {
  throw new TimeoutError(e);
}
function map(e, r) {
  return operate((t, n) => {
    let o = 0;
    t.subscribe(
      createOperatorSubscriber(n, (t) => {
        n.next(e.call(r, t, o++));
      })
    );
  });
}
const { isArray: isArray } = Array;
function callOrApply(e, r) {
  return isArray(r) ? e(...r) : e(r);
}
function mapOneOrManyArgs(e) {
  return map((r) => callOrApply(e, r));
}
function bindCallbackInternals(e, r, t, n) {
  if (t) {
    if (!isScheduler(t))
      return function (...o) {
        return bindCallbackInternals(e, r, n).apply(this, o).pipe(mapOneOrManyArgs(t));
      };
    n = t;
  }
  return n
    ? function (...t) {
        return bindCallbackInternals(e, r).apply(this, t).pipe(subscribeOn(n), observeOn(n));
      }
    : function (...t) {
        const n = new AsyncSubject();
        let o = !0;
        return new Observable((i) => {
          const s = n.subscribe(i);
          if (o) {
            o = !1;
            let i = !1,
              s = !1;
            r.apply(this, [
              ...t,
              (...r) => {
                if (e) {
                  const e = r.shift();
                  if (null != e) return void n.error(e);
                }
                n.next(1 < r.length ? r : r[0]), (s = !0), i && n.complete();
              },
            ]),
              s && n.complete(),
              (i = !0);
          }
          return s;
        });
      };
}
function bindCallback(e, r, t) {
  return bindCallbackInternals(!1, e, r, t);
}
function bindNodeCallback(e, r, t) {
  return bindCallbackInternals(!0, e, r, t);
}
const { isArray: isArray1 } = Array,
  { getPrototypeOf: getPrototypeOf, prototype: objectProto, keys: getKeys } = Object;
function argsArgArrayOrObject(e) {
  if (1 === e.length) {
    const r = e[0];
    if (isArray1(r)) return { args: r, keys: null };
    if (isPOJO(r)) {
      const e = getKeys(r);
      return { args: e.map((e) => r[e]), keys: e };
    }
  }
  return { args: e, keys: null };
}
function isPOJO(e) {
  return e && 'object' == typeof e && getPrototypeOf(e) === objectProto;
}
function createObject(e, r) {
  return e.reduce((e, t, n) => ((e[t] = r[n]), e), {});
}
function combineLatest(...e) {
  const r = popScheduler(e),
    t = popResultSelector(e),
    { args: n, keys: o } = argsArgArrayOrObject(e);
  if (0 === n.length) return from([], r);
  const i = new Observable(combineLatestInit(n, r, o ? (e) => createObject(o, e) : identity));
  return t ? i.pipe(mapOneOrManyArgs(t)) : i;
}
function combineLatestInit(e, r, t = identity) {
  return (n) => {
    maybeSchedule(
      r,
      () => {
        const { length: o } = e,
          i = new Array(o);
        let s = o,
          c = o;
        for (let u = 0; u < o; u++)
          maybeSchedule(
            r,
            () => {
              const o = from(e[u], r);
              let a = !1;
              o.subscribe(
                createOperatorSubscriber(
                  n,
                  (e) => {
                    (i[u] = e), a || ((a = !0), c--), c || n.next(t(i.slice()));
                  },
                  () => {
                    --s || n.complete();
                  }
                )
              );
            },
            n
          );
      },
      n
    );
  };
}
function maybeSchedule(e, r, t) {
  e ? executeSchedule(t, e, r) : r();
}
function mergeInternals(e, r, t, n, o, i, s, c) {
  const u = [];
  let a = 0,
    l = 0,
    b = !1;
  const p = () => {
      !b || u.length || a || r.complete();
    },
    d = (e) => (a < n ? h(e) : u.push(e)),
    h = (e) => {
      i && r.next(e), a++;
      let c = !1;
      innerFrom(t(e, l++)).subscribe(
        createOperatorSubscriber(
          r,
          (e) => {
            null == o || o(e), i ? d(e) : r.next(e);
          },
          () => {
            c = !0;
          },
          void 0,
          () => {
            if (c)
              try {
                for (a--; u.length && a < n; ) {
                  const e = u.shift();
                  s ? executeSchedule(r, s, () => h(e)) : h(e);
                }
                p();
              } catch (e) {
                r.error(e);
              }
          }
        )
      );
    };
  return (
    e.subscribe(
      createOperatorSubscriber(r, d, () => {
        (b = !0), p();
      })
    ),
    () => {
      null == c || c();
    }
  );
}
function mergeMap(e, r, t = 1 / 0) {
  return isFunction(r)
    ? mergeMap((t, n) => map((e, o) => r(t, e, n, o))(innerFrom(e(t, n))), t)
    : ('number' == typeof r && (t = r), operate((r, n) => mergeInternals(r, n, e, t)));
}
function mergeAll(e = 1 / 0) {
  return mergeMap(identity, e);
}
function concatAll() {
  return mergeAll(1);
}
function concat(...e) {
  return concatAll()(from(e, popScheduler(e)));
}
function defer(e) {
  return new Observable((r) => {
    innerFrom(e()).subscribe(r);
  });
}
const DEFAULT_CONFIG = { connector: () => new Subject(), resetOnDisconnect: !0 };
function connectable(e, r = DEFAULT_CONFIG) {
  let t = null;
  const { connector: n, resetOnDisconnect: o = !0 } = r;
  let i = n();
  const s = new Observable((e) => i.subscribe(e));
  return (s.connect = () => ((t && !t.closed) || ((t = defer(() => e).subscribe(i)), o && t.add(() => (i = n()))), t)), s;
}
function forkJoin(...e) {
  const r = popResultSelector(e),
    { args: t, keys: n } = argsArgArrayOrObject(e),
    o = new Observable((e) => {
      const { length: r } = t;
      if (!r) return void e.complete();
      const o = new Array(r);
      let i = r,
        s = r;
      for (let c = 0; c < r; c++) {
        let r = !1;
        innerFrom(t[c]).subscribe(
          createOperatorSubscriber(
            e,
            (e) => {
              r || ((r = !0), s--), (o[c] = e);
            },
            () => i--,
            void 0,
            () => {
              (i && r) || (s || e.next(n ? createObject(n, o) : o), e.complete());
            }
          )
        );
      }
    });
  return r ? o.pipe(mapOneOrManyArgs(r)) : o;
}
const nodeEventEmitterMethods = ['addListener', 'removeListener'],
  eventTargetMethods = ['addEventListener', 'removeEventListener'],
  jqueryMethods = ['on', 'off'];
function fromEvent(e, r, t, n) {
  if ((isFunction(t) && ((n = t), (t = void 0)), n)) return fromEvent(e, r, t).pipe(mapOneOrManyArgs(n));
  const [o, i] = isEventTarget(e)
    ? eventTargetMethods.map((n) => (o) => e[n](r, o, t))
    : isNodeStyleEventEmitter(e)
    ? nodeEventEmitterMethods.map(toCommonHandlerRegistry(e, r))
    : isJQueryStyleEventEmitter(e)
    ? jqueryMethods.map(toCommonHandlerRegistry(e, r))
    : [];
  if (!o && isArrayLike(e)) return mergeMap((e) => fromEvent(e, r, t))(innerFrom(e));
  if (!o) throw new TypeError('Invalid event target');
  return new Observable((e) => {
    const r = (...r) => e.next(1 < r.length ? r : r[0]);
    return o(r), () => i(r);
  });
}
function toCommonHandlerRegistry(e, r) {
  return (t) => (n) => e[t](r, n);
}
function isNodeStyleEventEmitter(e) {
  return isFunction(e.addListener) && isFunction(e.removeListener);
}
function isJQueryStyleEventEmitter(e) {
  return isFunction(e.on) && isFunction(e.off);
}
function isEventTarget(e) {
  return isFunction(e.addEventListener) && isFunction(e.removeEventListener);
}
function fromEventPattern(e, r, t) {
  return t
    ? fromEventPattern(e, r).pipe(mapOneOrManyArgs(t))
    : new Observable((t) => {
        const n = (...e) => t.next(1 === e.length ? e[0] : e),
          o = e(n);
        return isFunction(r) ? () => r(n, o) : void 0;
      });
}
function generate(e, r, t, n, o) {
  let i, s;
  function* c() {
    for (let e = s; !r || r(e); e = t(e)) yield i(e);
  }
  return (
    1 === arguments.length
      ? ({ initialState: s, condition: r, iterate: t, resultSelector: i = identity, scheduler: o } = e)
      : ((s = e), !n || isScheduler(n) ? ((i = identity), (o = n)) : (i = n)),
    defer(o ? () => scheduleIterable(c(), o) : c)
  );
}
function iif(e, r, t) {
  return defer(() => (e() ? r : t));
}
function timer(e = 0, r, t = async) {
  let n = -1;
  return (
    null != r && (isScheduler(r) ? (t = r) : (n = r)),
    new Observable((r) => {
      let o = isValidDate(e) ? +e - t.now() : e;
      o < 0 && (o = 0);
      let i = 0;
      return t.schedule(function () {
        r.closed || (r.next(i++), 0 <= n ? this.schedule(void 0, n) : r.complete());
      }, o);
    })
  );
}
function interval(e = 0, r = asyncScheduler) {
  return e < 0 && (e = 0), timer(e, e, r);
}
function merge(...e) {
  const r = popScheduler(e),
    t = popNumber(e, 1 / 0),
    n = e;
  return n.length ? (1 === n.length ? innerFrom(n[0]) : mergeAll(t)(from(n, r))) : EMPTY;
}
const NEVER = new Observable(noop);
function never() {
  return NEVER;
}
const { isArray: isArray2 } = Array;
function argsOrArgArray(e) {
  return 1 === e.length && isArray2(e[0]) ? e[0] : e;
}
function onErrorResumeNext(...e) {
  const r = argsOrArgArray(e);
  return new Observable((e) => {
    let t = 0;
    const n = () => {
      if (t < r.length) {
        let o;
        try {
          o = innerFrom(r[t++]);
        } catch (e) {
          return void n();
        }
        const i = new OperatorSubscriber(e, void 0, noop, noop);
        o.subscribe(i), i.add(n);
      } else e.complete();
    };
    n();
  });
}
function pairs(e, r) {
  return from(Object.entries(e), r);
}
function not(e, r) {
  return (t, n) => !e.call(r, t, n);
}
function filter(e, r) {
  return operate((t, n) => {
    let o = 0;
    t.subscribe(createOperatorSubscriber(n, (t) => e.call(r, t, o++) && n.next(t)));
  });
}
function partition(e, r, t) {
  return [filter(r, t)(innerFrom(e)), filter(not(r, t))(innerFrom(e))];
}
function race(...e) {
  return 1 === (e = argsOrArgArray(e)).length ? innerFrom(e[0]) : new Observable(raceInit(e));
}
function raceInit(e) {
  return (r) => {
    let t = [];
    for (let n = 0; t && !r.closed && n < e.length; n++)
      t.push(
        innerFrom(e[n]).subscribe(
          createOperatorSubscriber(r, (e) => {
            if (t) {
              for (let e = 0; e < t.length; e++) e !== n && t[e].unsubscribe();
              t = null;
            }
            r.next(e);
          })
        )
      );
  };
}
function range(e, r, t) {
  if ((null == r && ((r = e), (e = 0)), r <= 0)) return EMPTY;
  const n = r + e;
  return new Observable(
    t
      ? (r) => {
          let o = e;
          return t.schedule(function () {
            o < n ? (r.next(o++), this.schedule()) : r.complete();
          });
        }
      : (r) => {
          let t = e;
          for (; t < n && !r.closed; ) r.next(t++);
          r.complete();
        }
  );
}
function using(e, r) {
  return new Observable((t) => {
    const n = e(),
      o = r(n);
    return (
      (o ? innerFrom(o) : EMPTY).subscribe(t),
      () => {
        n && n.unsubscribe();
      }
    );
  });
}
function zip(...e) {
  const r = popResultSelector(e),
    t = argsOrArgArray(e);
  return t.length
    ? new Observable((e) => {
        let n = t.map(() => []),
          o = t.map(() => !1);
        e.add(() => {
          n = o = null;
        });
        for (let i = 0; !e.closed && i < t.length; i++)
          innerFrom(t[i]).subscribe(
            createOperatorSubscriber(
              e,
              (t) => {
                if ((n[i].push(t), n.every((e) => e.length))) {
                  const t = n.map((e) => e.shift());
                  e.next(r ? r(...t) : t), n.some((e, r) => !e.length && o[r]) && e.complete();
                }
              },
              () => {
                (o[i] = !0), !n[i].length && e.complete();
              }
            )
          );
        return () => {
          n = o = null;
        };
      })
    : EMPTY;
}
function audit(e) {
  return operate((r, t) => {
    let n = !1,
      o = null,
      i = null,
      s = !1;
    const c = () => {
        if ((null == i || i.unsubscribe(), (i = null), n)) {
          n = !1;
          const e = o;
          (o = null), t.next(e);
        }
        s && t.complete();
      },
      u = () => {
        (i = null), s && t.complete();
      };
    r.subscribe(
      createOperatorSubscriber(
        t,
        (r) => {
          (n = !0), (o = r), i || innerFrom(e(r)).subscribe((i = createOperatorSubscriber(t, c, u)));
        },
        () => {
          (s = !0), (!n || !i || i.closed) && t.complete();
        }
      )
    );
  });
}
function auditTime(e, r = asyncScheduler) {
  return audit(() => timer(e, r));
}
function buffer(e) {
  return operate((r, t) => {
    let n = [];
    return (
      r.subscribe(
        createOperatorSubscriber(
          t,
          (e) => n.push(e),
          () => {
            t.next(n), t.complete();
          }
        )
      ),
      innerFrom(e).subscribe(
        createOperatorSubscriber(
          t,
          () => {
            const e = n;
            (n = []), t.next(e);
          },
          noop
        )
      ),
      () => {
        n = null;
      }
    );
  });
}
function bufferCount(e, r = null) {
  return (
    (r = null != r ? r : e),
    operate((t, n) => {
      let o = [],
        i = 0;
      t.subscribe(
        createOperatorSubscriber(
          n,
          (t) => {
            let s = null;
            i++ % r == 0 && o.push([]);
            for (const r of o) r.push(t), e <= r.length && ((s = null != s ? s : []), s.push(r));
            if (s) for (const e of s) arrRemove(o, e), n.next(e);
          },
          () => {
            for (const e of o) n.next(e);
            n.complete();
          },
          void 0,
          () => {
            o = null;
          }
        )
      );
    })
  );
}
function bufferTime(e, ...r) {
  var t, n;
  const o = null !== (t = popScheduler(r)) && void 0 !== t ? t : asyncScheduler,
    i = null !== (n = r[0]) && void 0 !== n ? n : null,
    s = r[1] || 1 / 0;
  return operate((r, t) => {
    let n = [],
      c = !1;
    const u = (e) => {
        const { buffer: r, subs: o } = e;
        o.unsubscribe(), arrRemove(n, e), t.next(r), c && a();
      },
      a = () => {
        if (n) {
          const r = new Subscription();
          t.add(r);
          const i = { buffer: [], subs: r };
          n.push(i), executeSchedule(r, o, () => u(i), e);
        }
      };
    null !== i && i >= 0 ? executeSchedule(t, o, a, i, !0) : (c = !0), a();
    const l = createOperatorSubscriber(
      t,
      (e) => {
        const r = n.slice();
        for (const t of r) {
          const { buffer: r } = t;
          r.push(e), s <= r.length && u(t);
        }
      },
      () => {
        for (; null == n ? void 0 : n.length; ) t.next(n.shift().buffer);
        null == l || l.unsubscribe(), t.complete(), t.unsubscribe();
      },
      void 0,
      () => (n = null)
    );
    r.subscribe(l);
  });
}
function bufferToggle(e, r) {
  return operate((t, n) => {
    const o = [];
    innerFrom(e).subscribe(
      createOperatorSubscriber(
        n,
        (e) => {
          const t = [];
          o.push(t);
          const i = new Subscription();
          i.add(
            innerFrom(r(e)).subscribe(
              createOperatorSubscriber(
                n,
                () => {
                  arrRemove(o, t), n.next(t), i.unsubscribe();
                },
                noop
              )
            )
          );
        },
        noop
      )
    ),
      t.subscribe(
        createOperatorSubscriber(
          n,
          (e) => {
            for (const r of o) r.push(e);
          },
          () => {
            for (; o.length > 0; ) n.next(o.shift());
            n.complete();
          }
        )
      );
  });
}
function bufferWhen(e) {
  return operate((r, t) => {
    let n = null,
      o = null;
    const i = () => {
      null == o || o.unsubscribe();
      const r = n;
      (n = []), r && t.next(r), innerFrom(e()).subscribe((o = createOperatorSubscriber(t, i, noop)));
    };
    i(),
      r.subscribe(
        createOperatorSubscriber(
          t,
          (e) => (null == n ? void 0 : n.push(e)),
          () => {
            n && t.next(n), t.complete();
          },
          void 0,
          () => (n = o = null)
        )
      );
  });
}
function catchError(e) {
  return operate((r, t) => {
    let n,
      o = null,
      i = !1;
    (o = r.subscribe(
      createOperatorSubscriber(t, void 0, void 0, (s) => {
        (n = innerFrom(e(s, catchError(e)(r)))), o ? (o.unsubscribe(), (o = null), n.subscribe(t)) : (i = !0);
      })
    )),
      i && (o.unsubscribe(), (o = null), n.subscribe(t));
  });
}
function scanInternals(e, r, t, n, o) {
  return (i, s) => {
    let c = t,
      u = r,
      a = 0;
    i.subscribe(
      createOperatorSubscriber(
        s,
        (r) => {
          const t = a++;
          (u = c ? e(u, r, t) : ((c = !0), r)), n && s.next(u);
        },
        o &&
          (() => {
            c && s.next(u), s.complete();
          })
      )
    );
  };
}
function reduce(e, r) {
  return operate(scanInternals(e, r, arguments.length >= 2, !1, !0));
}
const arrReducer = (e, r) => (e.push(r), e);
function toArray() {
  return operate((e, r) => {
    reduce(arrReducer, [])(e).subscribe(r);
  });
}
function joinAllInternals(e, r) {
  return pipe(
    toArray(),
    mergeMap((r) => e(r)),
    r ? mapOneOrManyArgs(r) : identity
  );
}
function combineLatestAll(e) {
  return joinAllInternals(combineLatest, e);
}
function combineLatest1(...e) {
  const r = popResultSelector(e);
  return r
    ? pipe(combineLatest1(...e), mapOneOrManyArgs(r))
    : operate((r, t) => {
        combineLatestInit([r, ...argsOrArgArray(e)])(t);
      });
}
function combineLatestWith(...e) {
  return combineLatest1(...e);
}
function concatMap(e, r) {
  return isFunction(r) ? mergeMap(e, r, 1) : mergeMap(e, 1);
}
function concatMapTo(e, r) {
  return isFunction(r) ? concatMap(() => e, r) : concatMap(() => e);
}
function concat1(...e) {
  const r = popScheduler(e);
  return operate((t, n) => {
    concatAll()(from([t, ...e], r)).subscribe(n);
  });
}
function concatWith(...e) {
  return concat1(...e);
}
function fromSubscribable(e) {
  return new Observable((r) => e.subscribe(r));
}
const DEFAULT_CONFIG1 = { connector: () => new Subject() };
function connect(e, r = DEFAULT_CONFIG1) {
  const { connector: t } = r;
  return operate((r, n) => {
    const o = t();
    innerFrom(e(fromSubscribable(o))).subscribe(n), n.add(r.subscribe(o));
  });
}
function count(e) {
  return reduce((r, t, n) => (!e || e(t, n) ? r + 1 : r), 0);
}
function debounce(e) {
  return operate((r, t) => {
    let n = !1,
      o = null,
      i = null;
    const s = () => {
      if ((null == i || i.unsubscribe(), (i = null), n)) {
        n = !1;
        const e = o;
        (o = null), t.next(e);
      }
    };
    r.subscribe(
      createOperatorSubscriber(
        t,
        (r) => {
          null == i || i.unsubscribe(), (n = !0), (o = r), (i = createOperatorSubscriber(t, s, noop)), innerFrom(e(r)).subscribe(i);
        },
        () => {
          s(), t.complete();
        },
        void 0,
        () => {
          o = i = null;
        }
      )
    );
  });
}
function debounceTime(e, r = asyncScheduler) {
  return operate((t, n) => {
    let o = null,
      i = null,
      s = null;
    const c = () => {
      if (o) {
        o.unsubscribe(), (o = null);
        const e = i;
        (i = null), n.next(e);
      }
    };
    function u() {
      const t = s + e,
        i = r.now();
      if (i < t) return (o = this.schedule(void 0, t - i)), void n.add(o);
      c();
    }
    t.subscribe(
      createOperatorSubscriber(
        n,
        (t) => {
          (i = t), (s = r.now()), o || ((o = r.schedule(u, e)), n.add(o));
        },
        () => {
          c(), n.complete();
        },
        void 0,
        () => {
          i = o = null;
        }
      )
    );
  });
}
function defaultIfEmpty(e) {
  return operate((r, t) => {
    let n = !1;
    r.subscribe(
      createOperatorSubscriber(
        t,
        (e) => {
          (n = !0), t.next(e);
        },
        () => {
          n || t.next(e), t.complete();
        }
      )
    );
  });
}
function take(e) {
  return e <= 0
    ? () => EMPTY
    : operate((r, t) => {
        let n = 0;
        r.subscribe(
          createOperatorSubscriber(t, (r) => {
            ++n <= e && (t.next(r), e <= n && t.complete());
          })
        );
      });
}
function ignoreElements() {
  return operate((e, r) => {
    e.subscribe(createOperatorSubscriber(r, noop));
  });
}
function mapTo(e) {
  return map(() => e);
}
function delayWhen(e, r) {
  return r
    ? (t) => concat(r.pipe(take(1), ignoreElements()), t.pipe(delayWhen(e)))
    : mergeMap((r, t) => innerFrom(e(r, t)).pipe(take(1), mapTo(r)));
}
function delay(e, r = asyncScheduler) {
  const t = timer(e, r);
  return delayWhen(() => t);
}
function dematerialize() {
  return operate((e, r) => {
    e.subscribe(createOperatorSubscriber(r, (e) => observeNotification(e, r)));
  });
}
function distinct(e, r) {
  return operate((t, n) => {
    const o = new Set();
    t.subscribe(
      createOperatorSubscriber(n, (r) => {
        const t = e ? e(r) : r;
        o.has(t) || (o.add(t), n.next(r));
      })
    ),
      r && innerFrom(r).subscribe(createOperatorSubscriber(n, () => o.clear(), noop));
  });
}
function distinctUntilChanged(e, r = identity) {
  return (
    (e = null != e ? e : defaultCompare),
    operate((t, n) => {
      let o,
        i = !0;
      t.subscribe(
        createOperatorSubscriber(n, (t) => {
          const s = r(t);
          (!i && e(o, s)) || ((i = !1), (o = s), n.next(t));
        })
      );
    })
  );
}
function defaultCompare(e, r) {
  return e === r;
}
function distinctUntilKeyChanged(e, r) {
  return distinctUntilChanged((t, n) => (r ? r(t[e], n[e]) : t[e] === n[e]));
}
function throwIfEmpty(e = defaultErrorFactory) {
  return operate((r, t) => {
    let n = !1;
    r.subscribe(
      createOperatorSubscriber(
        t,
        (e) => {
          (n = !0), t.next(e);
        },
        () => (n ? t.complete() : t.error(e()))
      )
    );
  });
}
function defaultErrorFactory() {
  return new EmptyError();
}
function elementAt(e, r) {
  if (e < 0) throw new ArgumentOutOfRangeError();
  const t = arguments.length >= 2;
  return (n) =>
    n.pipe(
      filter((r, t) => t === e),
      take(1),
      t ? defaultIfEmpty(r) : throwIfEmpty(() => new ArgumentOutOfRangeError())
    );
}
function endWith(...e) {
  return (r) => concat(r, of(...e));
}
function every(e, r) {
  return operate((t, n) => {
    let o = 0;
    t.subscribe(
      createOperatorSubscriber(
        n,
        (i) => {
          e.call(r, i, o++, t) || (n.next(!1), n.complete());
        },
        () => {
          n.next(!0), n.complete();
        }
      )
    );
  });
}
function exhaustMap(e, r) {
  return r
    ? (t) => t.pipe(exhaustMap((t, n) => innerFrom(e(t, n)).pipe(map((e, o) => r(t, e, n, o)))))
    : operate((r, t) => {
        let n = 0,
          o = null,
          i = !1;
        r.subscribe(
          createOperatorSubscriber(
            t,
            (r) => {
              o ||
                ((o = createOperatorSubscriber(t, void 0, () => {
                  (o = null), i && t.complete();
                })),
                innerFrom(e(r, n++)).subscribe(o));
            },
            () => {
              (i = !0), !o && t.complete();
            }
          )
        );
      });
}
function exhaustAll() {
  return exhaustMap(identity);
}
function expand(e, r = 1 / 0, t) {
  return (r = (r || 0) < 1 ? 1 / 0 : r), operate((n, o) => mergeInternals(n, o, e, r, void 0, !0, t));
}
function finalize(e) {
  return operate((r, t) => {
    try {
      r.subscribe(t);
    } finally {
      t.add(e);
    }
  });
}
function find(e, r) {
  return operate(createFind(e, r, 'value'));
}
function createFind(e, r, t) {
  const n = 'index' === t;
  return (t, o) => {
    let i = 0;
    t.subscribe(
      createOperatorSubscriber(
        o,
        (s) => {
          const c = i++;
          e.call(r, s, c, t) && (o.next(n ? c : s), o.complete());
        },
        () => {
          o.next(n ? -1 : void 0), o.complete();
        }
      )
    );
  };
}
function findIndex(e, r) {
  return operate(createFind(e, r, 'index'));
}
function first(e, r) {
  const t = arguments.length >= 2;
  return (n) => n.pipe(e ? filter((r, t) => e(r, t, n)) : identity, take(1), t ? defaultIfEmpty(r) : throwIfEmpty(() => new EmptyError()));
}
function groupBy(e, r, t, n) {
  return operate((o, i) => {
    let s;
    r && 'function' != typeof r ? ({ duration: t, element: s, connector: n } = r) : (s = r);
    const c = new Map(),
      u = (e) => {
        c.forEach(e), e(i);
      },
      a = (e) => u((r) => r.error(e));
    let l = 0,
      b = !1;
    const p = new OperatorSubscriber(
      i,
      (r) => {
        try {
          const o = e(r);
          let u = c.get(o);
          if (!u) {
            c.set(o, (u = n ? n() : new Subject()));
            const e = (function (e, r) {
              const t = new Observable((e) => {
                l++;
                const t = r.subscribe(e);
                return () => {
                  t.unsubscribe(), 0 == --l && b && p.unsubscribe();
                };
              });
              return (t.key = e), t;
            })(o, u);
            if ((i.next(e), t)) {
              const r = createOperatorSubscriber(
                u,
                () => {
                  u.complete(), null == r || r.unsubscribe();
                },
                void 0,
                void 0,
                () => c.delete(o)
              );
              p.add(innerFrom(t(e)).subscribe(r));
            }
          }
          u.next(s ? s(r) : r);
        } catch (e) {
          a(e);
        }
      },
      () => u((e) => e.complete()),
      a,
      () => c.clear(),
      () => ((b = !0), 0 === l)
    );
    o.subscribe(p);
  });
}
function isEmpty() {
  return operate((e, r) => {
    e.subscribe(
      createOperatorSubscriber(
        r,
        () => {
          r.next(!1), r.complete();
        },
        () => {
          r.next(!0), r.complete();
        }
      )
    );
  });
}
function takeLast(e) {
  return e <= 0
    ? () => EMPTY
    : operate((r, t) => {
        let n = [];
        r.subscribe(
          createOperatorSubscriber(
            t,
            (r) => {
              n.push(r), e < n.length && n.shift();
            },
            () => {
              for (const e of n) t.next(e);
              t.complete();
            },
            void 0,
            () => {
              n = null;
            }
          )
        );
      });
}
function last1(e, r) {
  const t = arguments.length >= 2;
  return (n) =>
    n.pipe(e ? filter((r, t) => e(r, t, n)) : identity, takeLast(1), t ? defaultIfEmpty(r) : throwIfEmpty(() => new EmptyError()));
}
function materialize() {
  return operate((e, r) => {
    e.subscribe(
      createOperatorSubscriber(
        r,
        (e) => {
          r.next(Notification.createNext(e));
        },
        () => {
          r.next(Notification.createComplete()), r.complete();
        },
        (e) => {
          r.next(Notification.createError(e)), r.complete();
        }
      )
    );
  });
}
function max(e) {
  return reduce(isFunction(e) ? (r, t) => (e(r, t) > 0 ? r : t) : (e, r) => (e > r ? e : r));
}
function mergeMapTo(e, r, t = 1 / 0) {
  return isFunction(r) ? mergeMap(() => e, r, t) : ('number' == typeof r && (t = r), mergeMap(() => e, t));
}
function mergeScan(e, r, t = 1 / 0) {
  return operate((n, o) => {
    let i = r;
    return mergeInternals(
      n,
      o,
      (r, t) => e(i, r, t),
      t,
      (e) => {
        i = e;
      },
      !1,
      void 0,
      () => (i = null)
    );
  });
}
function merge1(...e) {
  const r = popScheduler(e),
    t = popNumber(e, 1 / 0);
  return (
    (e = argsOrArgArray(e)),
    operate((n, o) => {
      mergeAll(t)(from([n, ...e], r)).subscribe(o);
    })
  );
}
function mergeWith(...e) {
  return merge1(...e);
}
function min(e) {
  return reduce(isFunction(e) ? (r, t) => (e(r, t) < 0 ? r : t) : (e, r) => (e < r ? e : r));
}
function multicast(e, r) {
  const t = isFunction(e) ? e : () => e;
  return isFunction(r) ? connect(r, { connector: t }) : (e) => new ConnectableObservable(e, t);
}
function onErrorResumeNextWith(...e) {
  const r = argsOrArgArray(e);
  return (e) => onErrorResumeNext(e, ...r);
}
function pairwise() {
  return operate((e, r) => {
    let t,
      n = !1;
    e.subscribe(
      createOperatorSubscriber(r, (e) => {
        const o = t;
        (t = e), n && r.next([o, e]), (n = !0);
      })
    );
  });
}
function pluck(...e) {
  const r = e.length;
  if (0 === r) throw new Error('list of properties cannot be empty.');
  return map((t) => {
    let n = t;
    for (let t = 0; t < r; t++) {
      const r = null == n ? void 0 : n[e[t]];
      if (void 0 === r) return;
      n = r;
    }
    return n;
  });
}
function publish(e) {
  return e ? (r) => connect(e)(r) : (e) => multicast(new Subject())(e);
}
function publishBehavior(e) {
  return (r) => {
    const t = new BehaviorSubject(e);
    return new ConnectableObservable(r, () => t);
  };
}
function publishLast() {
  return (e) => {
    const r = new AsyncSubject();
    return new ConnectableObservable(e, () => r);
  };
}
function publishReplay(e, r, t, n) {
  t && !isFunction(t) && (n = t);
  const o = isFunction(t) ? t : void 0;
  return (t) => multicast(new ReplaySubject(e, r, n), o)(t);
}
function raceWith(...e) {
  return e.length
    ? operate((r, t) => {
        raceInit([r, ...e])(t);
      })
    : identity;
}
function repeat(e) {
  let r,
    t = 1 / 0;
  return (
    null != e && ('object' == typeof e ? ({ count: t = 1 / 0, delay: r } = e) : (t = e)),
    t <= 0
      ? () => EMPTY
      : operate((e, n) => {
          let o,
            i = 0;
          const s = () => {
              if ((null == o || o.unsubscribe(), (o = null), null != r)) {
                const e = 'number' == typeof r ? timer(r) : innerFrom(r(i)),
                  t = createOperatorSubscriber(n, () => {
                    t.unsubscribe(), c();
                  });
                e.subscribe(t);
              } else c();
            },
            c = () => {
              let r = !1;
              (o = e.subscribe(
                createOperatorSubscriber(n, void 0, () => {
                  ++i < t ? (o ? s() : (r = !0)) : n.complete();
                })
              )),
                r && s();
            };
          c();
        })
  );
}
function repeatWhen(e) {
  return operate((r, t) => {
    let n,
      o,
      i = !1,
      s = !1,
      c = !1;
    const u = () => c && s && (t.complete(), !0),
      a = () => {
        (c = !1),
          (n = r.subscribe(
            createOperatorSubscriber(t, void 0, () => {
              (c = !0),
                !u() &&
                  (o ||
                    ((o = new Subject()),
                    innerFrom(e(o)).subscribe(
                      createOperatorSubscriber(
                        t,
                        () => {
                          n ? a() : (i = !0);
                        },
                        () => {
                          (s = !0), u();
                        }
                      )
                    )),
                  o).next();
            })
          )),
          i && (n.unsubscribe(), (n = null), (i = !1), a());
      };
    a();
  });
}
function retry(e = 1 / 0) {
  let r;
  r = e && 'object' == typeof e ? e : { count: e };
  const { count: t = 1 / 0, delay: n, resetOnSuccess: o = !1 } = r;
  return t <= 0
    ? identity
    : operate((e, r) => {
        let i,
          s = 0;
        const c = () => {
          let u = !1;
          (i = e.subscribe(
            createOperatorSubscriber(
              r,
              (e) => {
                o && (s = 0), r.next(e);
              },
              void 0,
              (e) => {
                if (s++ < t) {
                  const t = () => {
                    i ? (i.unsubscribe(), (i = null), c()) : (u = !0);
                  };
                  if (null != n) {
                    const o = 'number' == typeof n ? timer(n) : innerFrom(n(e, s)),
                      i = createOperatorSubscriber(
                        r,
                        () => {
                          i.unsubscribe(), t();
                        },
                        () => {
                          r.complete();
                        }
                      );
                    o.subscribe(i);
                  } else t();
                } else r.error(e);
              }
            )
          )),
            u && (i.unsubscribe(), (i = null), c());
        };
        c();
      });
}
function retryWhen(e) {
  return operate((r, t) => {
    let n,
      o,
      i = !1;
    const s = () => {
      (n = r.subscribe(
        createOperatorSubscriber(t, void 0, void 0, (r) => {
          o || ((o = new Subject()), innerFrom(e(o)).subscribe(createOperatorSubscriber(t, () => (n ? s() : (i = !0))))), o && o.next(r);
        })
      )),
        i && (n.unsubscribe(), (n = null), (i = !1), s());
    };
    s();
  });
}
function sample(e) {
  return operate((r, t) => {
    let n = !1,
      o = null;
    r.subscribe(
      createOperatorSubscriber(t, (e) => {
        (n = !0), (o = e);
      })
    ),
      innerFrom(e).subscribe(
        createOperatorSubscriber(
          t,
          () => {
            if (n) {
              n = !1;
              const e = o;
              (o = null), t.next(e);
            }
          },
          noop
        )
      );
  });
}
function sampleTime(e, r = asyncScheduler) {
  return sample(interval(e, r));
}
function scan(e, r) {
  return operate(scanInternals(e, r, arguments.length >= 2, !0));
}
function sequenceEqual(e, r = (e, r) => e === r) {
  return operate((t, n) => {
    const o = createState(),
      i = createState(),
      s = (e) => {
        n.next(e), n.complete();
      },
      c = (e, t) => {
        const o = createOperatorSubscriber(
          n,
          (n) => {
            const { buffer: o, complete: i } = t;
            0 === o.length ? (i ? s(!1) : e.buffer.push(n)) : !r(n, o.shift()) && s(!1);
          },
          () => {
            e.complete = !0;
            const { complete: r, buffer: n } = t;
            r && s(0 === n.length), null == o || o.unsubscribe();
          }
        );
        return o;
      };
    t.subscribe(c(o, i)), innerFrom(e).subscribe(c(i, o));
  });
}
function createState() {
  return { buffer: [], complete: !1 };
}
function share(e = {}) {
  const { connector: r = () => new Subject(), resetOnError: t = !0, resetOnComplete: n = !0, resetOnRefCountZero: o = !0 } = e;
  return (e) => {
    let i,
      s,
      c,
      u = 0,
      a = !1,
      l = !1;
    const b = () => {
        null == s || s.unsubscribe(), (s = void 0);
      },
      p = () => {
        b(), (i = c = void 0), (a = l = !1);
      },
      d = () => {
        const e = i;
        p(), null == e || e.unsubscribe();
      };
    return operate((e, h) => {
      u++, l || a || b();
      const f = (c = null != c ? c : r());
      h.add(() => {
        u--, 0 !== u || l || a || (s = handleReset(d, o));
      }),
        f.subscribe(h),
        !i &&
          u > 0 &&
          ((i = new SafeSubscriber({
            next: (e) => f.next(e),
            error: (e) => {
              (l = !0), b(), (s = handleReset(p, t, e)), f.error(e);
            },
            complete: () => {
              (a = !0), b(), (s = handleReset(p, n)), f.complete();
            },
          })),
          innerFrom(e).subscribe(i));
    })(e);
  };
}
function handleReset(e, r, ...t) {
  if (!0 === r) return void e();
  if (!1 === r) return;
  const n = new SafeSubscriber({
    next: () => {
      n.unsubscribe(), e();
    },
  });
  return innerFrom(r(...t)).subscribe(n);
}
function shareReplay(e, r, t) {
  let n,
    o = !1;
  return (
    e && 'object' == typeof e
      ? ({ bufferSize: n = 1 / 0, windowTime: r = 1 / 0, refCount: o = !1, scheduler: t } = e)
      : (n = null != e ? e : 1 / 0),
    share({ connector: () => new ReplaySubject(n, r, t), resetOnError: !0, resetOnComplete: !1, resetOnRefCountZero: o })
  );
}
function single(e) {
  return operate((r, t) => {
    let n,
      o = !1,
      i = !1,
      s = 0;
    r.subscribe(
      createOperatorSubscriber(
        t,
        (c) => {
          (i = !0), (e && !e(c, s++, r)) || (o && t.error(new SequenceError('Too many matching values')), (o = !0), (n = c));
        },
        () => {
          o ? (t.next(n), t.complete()) : t.error(i ? new NotFoundError('No matching values') : new EmptyError());
        }
      )
    );
  });
}
function skip(e) {
  return filter((r, t) => e <= t);
}
function skipLast(e) {
  return e <= 0
    ? identity
    : operate((r, t) => {
        let n = new Array(e),
          o = 0;
        return (
          r.subscribe(
            createOperatorSubscriber(t, (r) => {
              const i = o++;
              if (i < e) n[i] = r;
              else {
                const o = i % e,
                  s = n[o];
                (n[o] = r), t.next(s);
              }
            })
          ),
          () => {
            n = null;
          }
        );
      });
}
function skipUntil(e) {
  return operate((r, t) => {
    let n = !1;
    const o = createOperatorSubscriber(
      t,
      () => {
        null == o || o.unsubscribe(), (n = !0);
      },
      noop
    );
    innerFrom(e).subscribe(o), r.subscribe(createOperatorSubscriber(t, (e) => n && t.next(e)));
  });
}
function skipWhile(e) {
  return operate((r, t) => {
    let n = !1,
      o = 0;
    r.subscribe(createOperatorSubscriber(t, (r) => (n || (n = !e(r, o++))) && t.next(r)));
  });
}
function startWith(...e) {
  const r = popScheduler(e);
  return operate((t, n) => {
    (r ? concat(e, t, r) : concat(e, t)).subscribe(n);
  });
}
function switchMap(e, r) {
  return operate((t, n) => {
    let o = null,
      i = 0,
      s = !1;
    const c = () => s && !o && n.complete();
    t.subscribe(
      createOperatorSubscriber(
        n,
        (t) => {
          null == o || o.unsubscribe();
          let s = 0;
          const u = i++;
          innerFrom(e(t, u)).subscribe(
            (o = createOperatorSubscriber(
              n,
              (e) => n.next(r ? r(t, e, u, s++) : e),
              () => {
                (o = null), c();
              }
            ))
          );
        },
        () => {
          (s = !0), c();
        }
      )
    );
  });
}
function switchAll() {
  return switchMap(identity);
}
function switchMapTo(e, r) {
  return isFunction(r) ? switchMap(() => e, r) : switchMap(() => e);
}
function switchScan(e, r) {
  return operate((t, n) => {
    let o = r;
    return (
      switchMap(
        (r, t) => e(o, r, t),
        (e, r) => ((o = r), r)
      )(t).subscribe(n),
      () => {
        o = null;
      }
    );
  });
}
function takeUntil(e) {
  return operate((r, t) => {
    innerFrom(e).subscribe(createOperatorSubscriber(t, () => t.complete(), noop)), !t.closed && r.subscribe(t);
  });
}
function takeWhile(e, r = !1) {
  return operate((t, n) => {
    let o = 0;
    t.subscribe(
      createOperatorSubscriber(n, (t) => {
        const i = e(t, o++);
        (i || r) && n.next(t), !i && n.complete();
      })
    );
  });
}
function tap(e, r, t) {
  const n = isFunction(e) || r || t ? { next: e, error: r, complete: t } : e;
  return n
    ? operate((e, r) => {
        var t;
        null === (t = n.subscribe) || void 0 === t || t.call(n);
        let o = !0;
        e.subscribe(
          createOperatorSubscriber(
            r,
            (e) => {
              var t;
              null === (t = n.next) || void 0 === t || t.call(n, e), r.next(e);
            },
            () => {
              var e;
              (o = !1), null === (e = n.complete) || void 0 === e || e.call(n), r.complete();
            },
            (e) => {
              var t;
              (o = !1), null === (t = n.error) || void 0 === t || t.call(n, e), r.error(e);
            },
            () => {
              var e, r;
              o && (null === (e = n.unsubscribe) || void 0 === e || e.call(n)), null === (r = n.finalize) || void 0 === r || r.call(n);
            }
          )
        );
      })
    : identity;
}
const defaultThrottleConfig = { leading: !0, trailing: !1 };
function throttle(e, r = defaultThrottleConfig) {
  return operate((t, n) => {
    const { leading: o, trailing: i } = r;
    let s = !1,
      c = null,
      u = null,
      a = !1;
    const l = () => {
        null == u || u.unsubscribe(), (u = null), i && (d(), a && n.complete());
      },
      b = () => {
        (u = null), a && n.complete();
      },
      p = (r) => (u = innerFrom(e(r)).subscribe(createOperatorSubscriber(n, l, b))),
      d = () => {
        if (s) {
          s = !1;
          const e = c;
          (c = null), n.next(e), !a && p(e);
        }
      };
    t.subscribe(
      createOperatorSubscriber(
        n,
        (e) => {
          (s = !0), (c = e), (!u || u.closed) && (o ? d() : p(e));
        },
        () => {
          (a = !0), (!(i && s && u) || u.closed) && n.complete();
        }
      )
    );
  });
}
function throttleTime(e, r = asyncScheduler, t = defaultThrottleConfig) {
  const n = timer(e, r);
  return throttle(() => n, t);
}
function timeInterval(e = asyncScheduler) {
  return operate((r, t) => {
    let n = e.now();
    r.subscribe(
      createOperatorSubscriber(t, (r) => {
        const o = e.now(),
          i = o - n;
        (n = o), t.next(new TimeInterval(r, i));
      })
    );
  });
}
class TimeInterval {
  constructor(e, r) {
    (this.value = e), (this.interval = r);
  }
}
function timeoutWith(e, r, t) {
  let n, o, i;
  if (((t = null != t ? t : async), isValidDate(e) ? (n = e) : 'number' == typeof e && (o = e), !r))
    throw new TypeError('No observable provided to switch to');
  if (((i = () => r), null == n && null == o)) throw new TypeError('No timeout provided.');
  return timeout({ first: n, each: o, scheduler: t, with: i });
}
function timestamp(e = dateTimestampProvider) {
  return map((r) => ({ value: r, timestamp: e.now() }));
}
function window(e) {
  return operate((r, t) => {
    let n = new Subject();
    t.next(n.asObservable());
    const o = (e) => {
      n.error(e), t.error(e);
    };
    return (
      r.subscribe(
        createOperatorSubscriber(
          t,
          (e) => (null == n ? void 0 : n.next(e)),
          () => {
            n.complete(), t.complete();
          },
          o
        )
      ),
      innerFrom(e).subscribe(
        createOperatorSubscriber(
          t,
          () => {
            n.complete(), t.next((n = new Subject()));
          },
          noop,
          o
        )
      ),
      () => {
        null == n || n.unsubscribe(), (n = null);
      }
    );
  });
}
function windowCount(e, r = 0) {
  const t = r > 0 ? r : e;
  return operate((r, n) => {
    let o = [new Subject()],
      i = 0;
    n.next(o[0].asObservable()),
      r.subscribe(
        createOperatorSubscriber(
          n,
          (r) => {
            for (const e of o) e.next(r);
            const s = i - e + 1;
            if ((s >= 0 && s % t == 0 && o.shift().complete(), ++i % t == 0)) {
              const e = new Subject();
              o.push(e), n.next(e.asObservable());
            }
          },
          () => {
            for (; o.length > 0; ) o.shift().complete();
            n.complete();
          },
          (e) => {
            for (; o.length > 0; ) o.shift().error(e);
            n.error(e);
          },
          () => {
            o = null;
          }
        )
      );
  });
}
function windowTime(e, ...r) {
  var t, n;
  const o = null !== (t = popScheduler(r)) && void 0 !== t ? t : asyncScheduler,
    i = null !== (n = r[0]) && void 0 !== n ? n : null,
    s = r[1] || 1 / 0;
  return operate((r, t) => {
    let n = [],
      c = !1;
    const u = (e) => {
        const { window: r, subs: t } = e;
        r.complete(), t.unsubscribe(), arrRemove(n, e), c && a();
      },
      a = () => {
        if (n) {
          const r = new Subscription();
          t.add(r);
          const i = new Subject(),
            s = { window: i, subs: r, seen: 0 };
          n.push(s), t.next(i.asObservable()), executeSchedule(r, o, () => u(s), e);
        }
      };
    null !== i && i >= 0 ? executeSchedule(t, o, a, i, !0) : (c = !0), a();
    const l = (e) => n.slice().forEach(e),
      b = (e) => {
        l(({ window: r }) => e(r)), e(t), t.unsubscribe();
      };
    return (
      r.subscribe(
        createOperatorSubscriber(
          t,
          (e) => {
            l((r) => {
              r.window.next(e), s <= ++r.seen && u(r);
            });
          },
          () => b((e) => e.complete()),
          (e) => b((r) => r.error(e))
        )
      ),
      () => {
        n = null;
      }
    );
  });
}
function windowToggle(e, r) {
  return operate((t, n) => {
    const o = [],
      i = (e) => {
        for (; 0 < o.length; ) o.shift().error(e);
        n.error(e);
      };
    innerFrom(e).subscribe(
      createOperatorSubscriber(
        n,
        (e) => {
          const t = new Subject();
          o.push(t);
          const s = new Subscription();
          let c;
          try {
            c = innerFrom(r(e));
          } catch (e) {
            return void i(e);
          }
          n.next(t.asObservable()),
            s.add(
              c.subscribe(
                createOperatorSubscriber(
                  n,
                  () => {
                    arrRemove(o, t), t.complete(), s.unsubscribe();
                  },
                  noop,
                  i
                )
              )
            );
        },
        noop
      )
    ),
      t.subscribe(
        createOperatorSubscriber(
          n,
          (e) => {
            const r = o.slice();
            for (const t of r) t.next(e);
          },
          () => {
            for (; 0 < o.length; ) o.shift().complete();
            n.complete();
          },
          i,
          () => {
            for (; 0 < o.length; ) o.shift().unsubscribe();
          }
        )
      );
  });
}
function windowWhen(e) {
  return operate((r, t) => {
    let n, o;
    const i = (e) => {
        n.error(e), t.error(e);
      },
      s = () => {
        let r;
        null == o || o.unsubscribe(), null == n || n.complete(), (n = new Subject()), t.next(n.asObservable());
        try {
          r = innerFrom(e());
        } catch (e) {
          return void i(e);
        }
        r.subscribe((o = createOperatorSubscriber(t, s, s, i)));
      };
    s(),
      r.subscribe(
        createOperatorSubscriber(
          t,
          (e) => n.next(e),
          () => {
            n.complete(), t.complete();
          },
          i,
          () => {
            null == o || o.unsubscribe(), (n = null);
          }
        )
      );
  });
}
function withLatestFrom(...e) {
  const r = popResultSelector(e);
  return operate((t, n) => {
    const o = e.length,
      i = new Array(o);
    let s = e.map(() => !1),
      c = !1;
    for (let r = 0; r < o; r++)
      innerFrom(e[r]).subscribe(
        createOperatorSubscriber(
          n,
          (e) => {
            (i[r] = e), c || s[r] || ((s[r] = !0), (c = s.every(identity)) && (s = null));
          },
          noop
        )
      );
    t.subscribe(
      createOperatorSubscriber(n, (e) => {
        if (c) {
          const t = [e, ...i];
          n.next(r ? r(...t) : t);
        }
      })
    );
  });
}
function zipAll(e) {
  return joinAllInternals(zip, e);
}
function zip1(...e) {
  return operate((r, t) => {
    zip(r, ...e).subscribe(t);
  });
}
function zipWith(...e) {
  return zip1(...e);
}
export { Observable };
export { ConnectableObservable };
export { observable };
export { animationFrames };
export { Subject };
export { BehaviorSubject };
export { ReplaySubject };
export { AsyncSubject };
export { asap, asapScheduler };
export { async, asyncScheduler };
export { queue, queueScheduler };
export { animationFrame, animationFrameScheduler };
export { VirtualTimeScheduler, VirtualAction };
export { Scheduler };
export { Subscription };
export { Subscriber };
export { Notification, NotificationKind };
export { pipe };
export { noop };
export { identity };
export { isObservable };
export { lastValueFrom };
export { firstValueFrom };
export { ArgumentOutOfRangeError };
export { EmptyError };
export { NotFoundError };
export { ObjectUnsubscribedError };
export { SequenceError };
export { TimeoutError };
export { UnsubscriptionError };
export { bindCallback };
export { bindNodeCallback };
export { combineLatest };
export { concat };
export { connectable };
export { defer };
export { empty };
export { forkJoin };
export { from };
export { fromEvent };
export { fromEventPattern };
export { generate };
export { iif };
export { interval };
export { merge };
export { never };
export { of };
export { onErrorResumeNext };
export { pairs };
export { partition };
export { race };
export { range };
export { throwError };
export { timer };
export { using };
export { zip };
export { scheduled };
export { EMPTY };
export { NEVER };
export { config };
export { audit };
export { auditTime };
export { buffer };
export { bufferCount };
export { bufferTime };
export { bufferToggle };
export { bufferWhen };
export { catchError };
export { combineLatestAll as combineAll };
export { combineLatestAll };
export { combineLatestWith };
export { concatAll };
export { concatMap };
export { concatMapTo };
export { concatWith };
export { connect };
export { count };
export { debounce };
export { debounceTime };
export { defaultIfEmpty };
export { delay };
export { delayWhen };
export { dematerialize };
export { distinct };
export { distinctUntilChanged };
export { distinctUntilKeyChanged };
export { elementAt };
export { endWith };
export { every };
export { exhaustAll as exhaust };
export { exhaustAll };
export { exhaustMap };
export { expand };
export { filter };
export { finalize };
export { find };
export { findIndex };
export { first };
export { groupBy };
export { ignoreElements };
export { isEmpty };
export { last1 as last };
export { map };
export { mapTo };
export { materialize };
export { max };
export { mergeAll };
export { mergeMap as flatMap };
export { mergeMap };
export { mergeMapTo };
export { mergeScan };
export { mergeWith };
export { min };
export { multicast };
export { observeOn };
export { onErrorResumeNextWith };
export { pairwise };
export { pluck };
export { publish };
export { publishBehavior };
export { publishLast };
export { publishReplay };
export { raceWith };
export { reduce };
export { repeat };
export { repeatWhen };
export { retry };
export { retryWhen };
export { refCount };
export { sample };
export { sampleTime };
export { scan };
export { sequenceEqual };
export { share };
export { shareReplay };
export { single };
export { skip };
export { skipLast };
export { skipUntil };
export { skipWhile };
export { startWith };
export { subscribeOn };
export { switchAll };
export { switchMap };
export { switchMapTo };
export { switchScan };
export { take };
export { takeLast };
export { takeUntil };
export { takeWhile };
export { tap };
export { throttle };
export { throttleTime };
export { throwIfEmpty };
export { timeInterval };
export { timeout };
export { timeoutWith };
export { timestamp };
export { toArray };
export { window };
export { windowCount };
export { windowTime };
export { windowToggle };
export { windowWhen };
export { withLatestFrom };
export { zipAll };
export { zipWith };
