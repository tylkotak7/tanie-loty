package pl.lotypoz;

import android.app.job.JobParameters;
import android.app.job.JobService;

public class DealJob extends JobService {
    @Override
    public boolean onStartJob(final JobParameters params) {
        new Thread(() -> {
            try { Alerts.runCheck(DealJob.this); } catch (Exception ignored) {}
            jobFinished(params, false);
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        return true;
    }
}
