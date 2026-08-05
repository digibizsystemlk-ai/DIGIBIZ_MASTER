package app.web.digibiz_sys.twa.fragments;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import app.web.digibiz_sys.twa.LauncherActivity;
import app.web.digibiz_sys.twa.R;

public class MoreFragment extends Fragment {

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_more, container, false);

        Button btnLogout = view.findViewById(R.id.btnLogout);
        if (btnLogout != null) {
            btnLogout.setOnClickListener(v -> {
                if (getActivity() != null) {
                    Intent intent = new Intent(getActivity(), LauncherActivity.class);
                    intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                    getActivity().finish();
                }
            });
        }

        View desktopWebLink = view.findViewById(R.id.txtProfileSubscription);
        if (desktopWebLink != null) {
            desktopWebLink.setOnClickListener(v -> {
                Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/account/subscriptions"));
                startActivity(browserIntent);
            });
        }

        return view;
    }
}
