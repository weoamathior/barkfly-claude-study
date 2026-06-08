package com.zoo.web;

import com.zoo.config.ZooProperties;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * Serves the exhibit pages on the portal origin (:8080). Each exhibit gets a
 * Thymeleaf template under templates/exhibits/. Both origins are passed in so
 * pages can build cross-origin iframe URLs and origin allowlists.
 */
@Controller
public class ExhibitsController {

    private final ZooProperties props;

    public ExhibitsController(ZooProperties props) {
        this.props = props;
    }

    @GetMapping("/exhibit/{slug}")
    public String exhibit(@PathVariable String slug, Model model) {
        Exhibit ex = Exhibit.ALL.stream()
                .filter(e -> e.slug().equals(slug) && e.live())
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No live exhibit: " + slug));
        model.addAttribute("ex", ex);
        model.addAttribute("portalOrigin", props.getPortalOrigin());
        model.addAttribute("childOrigin", props.getChildOrigin());
        return "exhibits/" + slug;
    }
}
