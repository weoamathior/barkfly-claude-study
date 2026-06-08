package com.zoo.web;

import com.zoo.config.ZooProperties;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * The Unified Portal home dashboard. Lists every exhibit; the live ones link to
 * their pages, the rest are flagged "coming soon".
 */
@Controller
public class HomeController {

    private final ZooProperties props;

    public HomeController(ZooProperties props) {
        this.props = props;
    }

    @GetMapping("/")
    public String home(Model model) {
        model.addAttribute("exhibits", Exhibit.ALL);
        model.addAttribute("portalOrigin", props.getPortalOrigin());
        model.addAttribute("childOrigin", props.getChildOrigin());
        return "home";
    }
}
