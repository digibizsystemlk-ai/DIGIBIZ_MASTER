package app.web.digibiz_sys.twa;

import android.os.Bundle;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import app.web.digibiz_sys.twa.fragments.HomeFragment;
import app.web.digibiz_sys.twa.fragments.InventoryFragment;
import app.web.digibiz_sys.twa.fragments.MoreFragment;
import app.web.digibiz_sys.twa.fragments.PosFragment;

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        BottomNavigationView bottomNav = findViewById(R.id.bottom_navigation);
        bottomNav.setOnItemSelectedListener(item -> {
            Fragment selectedFragment = null;
            int itemId = item.getItemId();

            if (itemId == R.id.navigation_home) {
                selectedFragment = new HomeFragment();
            } else if (itemId == R.id.navigation_pos) {
                selectedFragment = new PosFragment();
            } else if (itemId == R.id.navigation_inventory) {
                selectedFragment = new InventoryFragment();
            } else if (itemId == R.id.navigation_more) {
                selectedFragment = new MoreFragment();
            }

            if (selectedFragment != null) {
                getSupportFragmentManager().beginTransaction()
                        .replace(R.id.fragment_container, selectedFragment)
                        .commit();
                return true;
            }
            return false;
        });

        // Default to Home Fragment
        if (savedInstanceState == null) {
            getSupportFragmentManager().beginTransaction()
                    .replace(R.id.fragment_container, new HomeFragment())
                    .commit();
        }
    }
}
