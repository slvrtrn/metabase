(ns metabase-enterprise.content-verification.api.review-test
  (:require
   [clojure.test :refer :all]
   [metabase.models.card :refer [Card]]
   [metabase.models.moderation-review :as moderation-review :refer [ModerationReview]]
   [metabase.test :as mt]
   [toucan2.core :as t2]))

(defn- normalized-response
  [moderation-review]
  (dissoc moderation-review :id :updated_at :created_at))

;;todo: check it can review dashboards, and that it cannot review other models
(deftest create-test
  (testing "POST /api/moderation-review"
    (testing "Should require a token with `:content-verification`"
      (mt/with-premium-features #{}
        (mt/assert-has-premium-feature-error "Content verification" (mt/user-http-request :rasta :post 402 "moderation-review"
                                                                                          {:text                "review"
                                                                                           :status              "verified"
                                                                                           :moderated_item_id   1
                                                                                           :moderated_item_type "card"}))))

    (mt/with-premium-features #{:content-verification}
      (mt/with-temp [Card {card-id :id} {:name "Test Card"}]
        (mt/with-model-cleanup [ModerationReview]
          (letfn [(moderate! [{:keys [status reason]} text]
                    (normalized-response
                     (mt/user-http-request :crowberto :post 200 "moderation-review"
                                           {:text                text
                                            :status              status
                                            :reason              reason
                                            :moderated_item_id   card-id
                                            :moderated_item_type "card"})))
                  (review-count [] (t2/count ModerationReview
                                             :moderated_item_id card-id
                                             :moderated_item_type "card"))]
            (testing "Non admin cannot create a moderation review"
              (is (= 0 (review-count)))
              (is (= "You don't have permissions to do that."
                     (mt/user-http-request :rasta :post 403 "moderation-review"
                                           {:text                "review"
                                            :status              "verified"
                                            :moderated_item_id   card-id
                                            :moderated_item_type "card"})))
              (is (= 0 (review-count))))
            (is (= {:text                "Looks good to me"
                    :moderated_item_id   card-id
                    :moderated_item_type "card"
                    :moderator_id        (mt/user->id :crowberto)
                    :status              "verified"
                    :most_recent         true
                    :reason              nil}
                   (moderate! {:status "verified"} "Looks good to me")))
            (testing "When adding a new moderation review, marks it as most recent"
              (is (= {:text        "hmm"
                      :status      nil
                      :most_recent true}
                     (select-keys (moderate! {:status nil} "hmm") [:text :status :most_recent])))
              (testing "And previous moderation reviews are marked as not :most_recent"
                (is (= #{{:text "hmm" :most_recent true :status nil}
                         {:text "Looks good to me" :most_recent false :status "verified"}}
                       (into #{}
                             (map #(select-keys % [:text :status :most_recent]))
                             (t2/select ModerationReview
                                        :moderated_item_id card-id
                                        :moderated_item_type "card"))))))
            (testing "Ensures we never have more than `modreview/max-moderation-reviews`"
              (t2/insert! ModerationReview (repeat (* 2 moderation-review/max-moderation-reviews)
                                                   {:moderated_item_id   card-id
                                                    :moderated_item_type "card"
                                                    :moderator_id        (mt/user->id :crowberto)
                                                    :most_recent         false
                                                    :status              "verified"
                                                    :text                "old review"}))
              ;; manually inserted many

              (is (> (review-count) moderation-review/max-moderation-reviews))
              (moderate! {:status "verified"} "lookin good")
              ;; api ensures we never have more than our limit

              (is (<= (review-count) moderation-review/max-moderation-reviews)))
            (testing "Only allows for valid status"
              (doseq [status moderation-review/statuses]
                (is (= status (:status (moderate! {:status status} "good")))))
              (mt/user-http-request :crowberto :post 400 "moderation-review"
                                    {:text                "not a chance this works"
                                     :status              "invalid status"
                                     :moderated_item_id   card-id
                                     :moderated_item_type "card"}))

            (testing "Only allows for valid reason"
              (doseq [status moderation-review/statuses]
                (is (= status (:status (moderate! {:status status} "good")))))
              (mt/user-http-request :crowberto :post 400 "moderation-review"
                                    {:text                "not a chance this works"
                                     :status              "verified"
                                     :moderated_item_id   card-id
                                     :reason              :invalid-reason
                                     :moderated_item_type "card"}))

            (testing "Allows for valid reason"
              (doseq [reason (keys @#'moderation-review/reasons)]
                (is (= reason (keyword (:reason (moderate! {:reason reason} "good"))))))
              (mt/user-http-request :crowberto :post 400 "moderation-review"
                                    {:text                "not a chance this works"
                                     :status              nil
                                     :moderated_item_id   card-id
                                     :reason              :just-because
                                     :moderated_item_type "card"}))

            (testing "Can't moderate a card that doesn't exist"
              (is (= "Not found."
                     (mt/user-http-request :crowberto :post 404 "moderation-review"
                                           {:text                "card doesn't exist"
                                            :status              "verified"
                                            :moderated_item_id   Integer/MAX_VALUE
                                            :moderated_item_type "card"}))))))))))
