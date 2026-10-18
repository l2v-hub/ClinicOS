"use strict";
async function withHeldCorrection(correction, entered, release, run, timeoutMs = 5e3) {
    const settled = correction.then((value) => ({ ok: true, value }), (error) => ({ ok: false, error }));
    async function bounded(operation, message) {
        let timer;
        try {
            return await Promise.race([
                operation,
                new Promise((_, reject) => {
                    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
                }),
            ]);
        }
        finally {
            clearTimeout(timer);
        }
    }
    let failed = false;
    let primary;
    try {
        await bounded(Promise.race([
            entered,
            settled.then((result) => {
                if (!result.ok)
                    throw result.error;
                throw new Error('Correction settled before interpreter entry');
            }),
        ]), 'Correction did not reach interpreter entry');
        // Attach rejection handling before invoking the callback, including late rejection after timeout.
        await bounded(Promise.resolve().then(run), 'Confirmation callback did not complete');
    }
    catch (error) {
        failed = true;
        primary = error;
        throw error;
    }
    finally {
        release();
        try {
            const result = await bounded(settled, 'Correction did not settle after barrier release');
            if (!result.ok)
                throw result.error;
        }
        catch (cleanupError) {
            if (!failed)
                throw cleanupError;
            if (cleanupError !== primary)
                throw new AggregateError([primary, cleanupError], 'Correction and cleanup failed', {
                    cause: primary,
                });
        }
    }
}

export {withHeldCorrection};
