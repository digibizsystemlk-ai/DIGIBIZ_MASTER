package app.web.digibiz_sys.twa;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;

public class SubscriptionActivity extends Activity {

    private PlayBillingHelper mBillingHelper;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_subscription);

        mBillingHelper = new PlayBillingHelper(this);

        Button btnSubscribe = findViewById(R.id.btnSubscribe);
        Button btnContinueDemo = findViewById(R.id.btnContinueDemo);

        btnSubscribe.setOnClickListener(v -> {
            if (mBillingHelper != null) {
                mBillingHelper.launchPurchaseFlow();
            }
        });

        btnContinueDemo.setOnClickListener(v -> {
            Intent intent = new Intent(SubscriptionActivity.this, MainActivity.class);
            startActivity(intent);
            finish();
        });
    }
}
