# Decisions and source versions

## Find your project, tasks and changes

The project selector remains visible in Full and Compact layouts. The context
strip names the current file when reviewing, and explicitly says **Project
overview** when showing all registered text sources. Website focus keeps these
controls inside its Navigation dialog.

The three work areas are **Review findings**, **Tasks** and **Change history**.
Review findings retains website, source, file-report and project-report views.
Finding cards and the selected passage show the full mapped text unit, with the
exact phrase highlighted. Coverage, rule details and optional tools expand on demand.

Tasks lists saved tasks across the project's configured, existing source files.
Search by instruction or file and filter by the next step. Opening a task selects
that exact task in its file. **Create task** opens the existing explicit save/start
workflow; simply opening a work area does not start a runner. The lifecycle is
save, start, review the result, apply, then verify. Verification is a separate
project-check action; an applied task is not proof of a passing check.

Change history includes proposals with and without linked tasks. It defaults to
applied changes; choose all entries to include pending proposals. Search also
matches the before/after text, so you do not need to know its filename. The first
entry and search results expose the comparison immediately. A source-change
notice identifies historical snapshots; the recorded diff is not today's Git diff.
**Applied** means saved locally, not verified or published. Unknown legacy dates
are labelled unknown. Refresh reloads persisted records; the overview does not
automatically poll. Deleted or no-longer-configured source files are outside this view.

The URL preserves the selected project, file and work area. Existing saved
proposals and tasks remain compatible; there is no metadata migration or rule-score
change. The activity API's source freshness compares content versions only;
opening a task performs its existing complete source/feedback checks.

## Keep a passage or review a change

Select a mapped passage or open a finding. **Keep as written** saves the exact
quote and source version; add a reason when it helps future reviewers. The source
and rule remain unchanged. An edit to the source makes the old decision stale.

**Generate alternatives** requests one to three replacements with reasons from
the configured Runner. An optional direction can guide the request. If no model
route is available, configure one using the [Runner guide](runner-integration.md).
Choose **Review this change** to prepare a diff, then inspect and apply it as a
separate action. Use your own feedback or wording when needed.

Runs remain visible and cancellable after changing the selection. If a start is
unconfirmed, retry the existing request rather than starting another generation.
Review saved candidates against the current selection and source version.

## Check which source you are reviewing

**File and Git** shows the file, content version and optional repository details.
File and repository change states are separate. Refresh after external edits;
the displayed branch does not identify the revision deployed online.

A saved task result includes its file, task/run IDs, time, original source version
and recorded edits. That is the saved proposal's diff, even if today's source has
changed. The [storage reference](workflow.md#files-beside-the-source) shows where
these records live and how their references connect.

## If marks are missing

Check that marks are enabled, then open the connection badge for mapping counts
and source details. A file assignment alone does not establish a text match. Open a finding to locate its
text; it may be outside the viewport. Text inside an image cannot be underlined
as mapped DOM text. For a mismatch, check the source adapter's unit ID and exact
text using the [bridge guide](../packages/review/LIVE-BRIDGE.md).

If the same page shows marks in a normal browser but not in an embedded browser,
use the normal browser for that review. The VS Code-specific rendering issue has
not been reproduced or fixed.

## Language and layout

English is the default. Choose EN/DE for the interface and rule explanations;
source quotes, feedback and model prose keep their original language. Compact
reduces navigation height. Website focus hides navigation behind floating
controls; its navigation opens above the page. An open review always occupies a
separate column beside the website. In Website focus, Escape closes the navigation
dialog or the open review. Language and display preferences are saved when browser
storage is available.

## Resize the workspace

Drag the separator beside the review or the project/file sidebar to change its
width. Both separators support touch, arrow keys, Home and End. The review stays
beside the website in Full, Compact and Website focus, including on small screens.
Closing it returns that space to the website. The visible widths adapt to the
viewport; resizing the window preserves the saved width preferences.

Projects and Files collapse independently. Collapse Projects to give Files more
space. Projects use compact rows; the file list uses the remaining sidebar height
and scrolls separately. These section preferences persist in this browser.

In Website focus, drag the grip beside Navigation to reposition the controls.
Keyboard arrows move the focused grip; Home places it at the top left and End at
the bottom right. Its saved position stays within the viewport after resizing.

The connection badge opens source selection, mapping counts and connection
details. Closing the details leaves the badge in the browser toolbar.
